import type { TimelineEntity } from '../store/timelineSlice';
import type { ToolRuntime } from '../tools/toolRuntime';
import type { CanonicalFrame, SnapshotEntityFrame } from './protocol';

export type TimelineMutation = {
  upsert?: TimelineEntity;
  upsertIfExists?: TimelineEntity;
  deleteId?: string;
  status?: string;
};

export type LiveProjectionContext = {
  sessionId: string;
  toolRuntime?: ToolRuntime;
  getEntity?: (id: string) => TimelineEntity | undefined;
};

export type SnapshotProjectionContext = {
  sessionId: string;
  snapshotOrdinal?: unknown;
};

export type SupportedHydrationPolicy = {
  kind: 'supported';
  project: (entity: SnapshotEntityFrame, context: SnapshotProjectionContext) => TimelineMutation | TimelineEntity | null;
};

export type UnsupportedHydrationPolicy = {
  kind: 'not-supported';
  reason: string;
};

export type HydrationPolicy = SupportedHydrationPolicy | UnsupportedHydrationPolicy;

export type TimelineLiveProjection = {
  accepts: (frame: CanonicalFrame) => boolean;
  project: (frame: CanonicalFrame, context: LiveProjectionContext) => TimelineMutation | null;
};

export type TimelineAdapter = {
  name: string;
  priority?: number;
  live?: TimelineLiveProjection;
  hydrate: HydrationPolicy;
};

export type TimelineProjectionResult = {
  mutation: TimelineMutation;
  adapterName: string;
};

export type HydrationCoverageReport = {
  adapters: Array<{ name: string; hydration: 'supported' | 'not-supported'; reason?: string }>;
};

export type TimelineAdapterRegistry = {
  register: (adapter: TimelineAdapter) => () => void;
  projectLive: (frame: CanonicalFrame, context: LiveProjectionContext) => TimelineProjectionResult | null;
  projectSnapshot: (entity: SnapshotEntityFrame, context: SnapshotProjectionContext) => TimelineProjectionResult | null;
  list: () => TimelineAdapter[];
  revision: () => number;
  assertHydrationCoverage: () => HydrationCoverageReport;
};

type RegisteredTimelineAdapter = TimelineAdapter & { registrationOrder: number };

export class ChatTimelineAdapterRegistry implements TimelineAdapterRegistry {
  private adapters: RegisteredTimelineAdapter[] = [];
  private registryRevision = 0;
  private nextRegistrationOrder = 0;

  register(adapter: TimelineAdapter): () => void {
    const normalized = normalizeAdapter(adapter, this.nextRegistrationOrder++);
    if (this.adapters.some((candidate) => candidate.name === normalized.name)) {
      throw new Error(`timeline adapter ${normalized.name} is already registered`);
    }
    this.adapters.push(normalized);
    this.adapters.sort(compareAdapters);
    this.registryRevision++;
    return () => {
      const before = this.adapters.length;
      this.adapters = this.adapters.filter((candidate) => candidate !== normalized);
      if (this.adapters.length !== before) this.registryRevision++;
    };
  }

  projectLive(frame: CanonicalFrame, context: LiveProjectionContext): TimelineProjectionResult | null {
    for (const adapter of this.adapters) {
      if (!adapter.live?.accepts(frame)) continue;
      const mutation = adapter.live.project(frame, context);
      if (mutation) return { mutation, adapterName: adapter.name };
    }
    return null;
  }

  projectSnapshot(entity: SnapshotEntityFrame, context: SnapshotProjectionContext): TimelineProjectionResult | null {
    for (const adapter of this.adapters) {
      if (adapter.hydrate.kind !== 'supported') continue;
      const projected = adapter.hydrate.project(entity, context);
      const mutation = normalizeProjection(projected);
      if (mutation) return { mutation, adapterName: adapter.name };
    }
    return null;
  }

  list(): TimelineAdapter[] {
    return this.adapters.map(({ registrationOrder: _, ...adapter }) => adapter);
  }

  revision(): number {
    return this.registryRevision;
  }

  assertHydrationCoverage(): HydrationCoverageReport {
    return {
      adapters: this.adapters.map((adapter) =>
        adapter.hydrate.kind === 'supported'
          ? { name: adapter.name, hydration: 'supported' }
          : { name: adapter.name, hydration: 'not-supported', reason: adapter.hydrate.reason },
      ),
    };
  }
}

export function createTimelineAdapterRegistry(): TimelineAdapterRegistry {
  return new ChatTimelineAdapterRegistry();
}

export function defineTimelineAdapter<T extends TimelineAdapter>(adapter: T): T {
  normalizeAdapter(adapter, 0);
  return adapter;
}

export function defineLiveAndHydrateAdapter<T extends Omit<TimelineAdapter, 'hydrate'> & { hydrate: SupportedHydrationPolicy }>(adapter: T): T {
  if (!adapter.live) throw new Error('live+hydrate timeline adapter requires live projection');
  normalizeAdapter(adapter, 0);
  return adapter;
}

export function defineLiveOnlyAdapter<T extends Omit<TimelineAdapter, 'hydrate'> & { hydrationUnsupportedReason: string }>(adapter: T): TimelineAdapter {
  const reason = adapter.hydrationUnsupportedReason.trim();
  if (!reason) throw new Error('live-only timeline adapter requires a hydrationUnsupportedReason');
  const { hydrationUnsupportedReason: _, ...rest } = adapter;
  return defineTimelineAdapter({ ...rest, hydrate: { kind: 'not-supported', reason } });
}

export function defineHydrateOnlyAdapter<T extends Omit<TimelineAdapter, 'live'>>(adapter: T): T {
  normalizeAdapter(adapter, 0);
  return adapter;
}

function normalizeAdapter(adapter: TimelineAdapter, registrationOrder: number): RegisteredTimelineAdapter {
  const name = adapter?.name?.trim();
  if (!name) throw new Error('timeline adapter requires a name');
  if (!adapter.live && adapter.hydrate?.kind !== 'supported') {
    throw new Error(`timeline adapter ${name} must provide live projection or supported hydration`);
  }
  if (!adapter.hydrate) throw new Error(`timeline adapter ${name} requires an explicit hydration policy`);
  if (adapter.hydrate.kind === 'not-supported' && !adapter.hydrate.reason.trim()) {
    throw new Error(`timeline adapter ${name} has unsupported hydration without a reason`);
  }
  if (adapter.live && typeof adapter.live.accepts !== 'function') {
    throw new Error(`timeline adapter ${name} live projection requires accepts()`);
  }
  if (adapter.live && typeof adapter.live.project !== 'function') {
    throw new Error(`timeline adapter ${name} live projection requires project()`);
  }
  if (adapter.hydrate.kind === 'supported' && typeof adapter.hydrate.project !== 'function') {
    throw new Error(`timeline adapter ${name} supported hydration requires project()`);
  }
  return { ...adapter, name, registrationOrder };
}

function compareAdapters(a: RegisteredTimelineAdapter, b: RegisteredTimelineAdapter): number {
  const priorityDiff = (a.priority ?? 0) - (b.priority ?? 0);
  if (priorityDiff !== 0) return priorityDiff;
  return a.registrationOrder - b.registrationOrder;
}

function normalizeProjection(projected: TimelineMutation | TimelineEntity | null): TimelineMutation | null {
  if (!projected) return null;
  if ('kind' in projected && 'id' in projected && 'props' in projected) {
    return { upsert: projected };
  }
  return projected;
}
