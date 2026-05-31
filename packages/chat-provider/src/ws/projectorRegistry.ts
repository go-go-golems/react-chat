import type { ToolRuntime } from '../tools/toolRuntime';
import type { CanonicalFrame } from './protocol';
import type { TimelineMutation } from './timelineEvents';

export type TimelineProjectorContext = {
  sessionId: string;
  toolRuntime?: ToolRuntime;
};

export type TimelineProjector = {
  name: string;
  priority?: number;
  project: (frame: CanonicalFrame, context: TimelineProjectorContext) => TimelineMutation | null;
};

export type TimelineProjectionResult = {
  mutation: TimelineMutation;
  projectorName: string;
};

export type TimelineProjectorRegistry = {
  register: (projector: TimelineProjector) => () => void;
  project: (frame: CanonicalFrame, context: TimelineProjectorContext) => TimelineProjectionResult | null;
  list: () => TimelineProjector[];
  revision: () => number;
};

export class ChatTimelineProjectorRegistry implements TimelineProjectorRegistry {
  private projectors: TimelineProjector[] = [];
  private registryRevision = 0;

  register(projector: TimelineProjector): () => void {
    const name = projector.name.trim();
    if (!name) throw new Error('timeline projector requires a name');
    const normalized = { ...projector, name };
    this.projectors.push(normalized);
    this.projectors.sort(compareProjectors);
    this.registryRevision++;
    return () => {
      const before = this.projectors.length;
      this.projectors = this.projectors.filter((candidate) => candidate !== normalized);
      if (this.projectors.length !== before) this.registryRevision++;
    };
  }

  project(frame: CanonicalFrame, context: TimelineProjectorContext): TimelineProjectionResult | null {
    for (const projector of this.projectors) {
      const mutation = projector.project(frame, context);
      if (mutation) return { mutation, projectorName: projector.name };
    }
    return null;
  }

  list(): TimelineProjector[] {
    return [...this.projectors];
  }

  revision(): number {
    return this.registryRevision;
  }
}

function compareProjectors(a: TimelineProjector, b: TimelineProjector): number {
  const priorityDiff = (a.priority ?? 0) - (b.priority ?? 0);
  if (priorityDiff !== 0) return priorityDiff;
  return a.name.localeCompare(b.name);
}

export function createTimelineProjectorRegistry(): TimelineProjectorRegistry {
  return new ChatTimelineProjectorRegistry();
}

export function defineTimelineProjector<T extends TimelineProjector>(projector: T): T {
  return projector;
}
