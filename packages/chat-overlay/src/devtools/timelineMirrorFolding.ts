import {
  createEmptyTimelineMirror,
  type ChatDebugEntry,
  type TimelineMirrorState,
} from '@go-go-golems/chat-provider';

export interface TimelineSnapshotEntityLike {
  id?: unknown;
  kind?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  version?: unknown;
  props?: unknown;
  payload?: unknown;
}

function toMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function unwrapAny(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const payload = value as Record<string, unknown>;
  const nested = payload.value;
  if (nested && typeof nested === 'object' && !Array.isArray(nested) && Object.keys(nested).length > 0) {
    return nested as Record<string, unknown>;
  }
  return payload;
}

export function seedTimelineMirrorFromSnapshot(entities: TimelineSnapshotEntityLike[]): TimelineMirrorState {
  const mirror = createEmptyTimelineMirror();
  for (const raw of entities) {
    const id = String(raw.id ?? '');
    if (!id) continue;
    mirror.byId[id] = {
      id,
      kind: String(raw.kind ?? 'unknown'),
      createdAt: toMillis(raw.createdAt),
      updatedAt: raw.updatedAt === undefined ? undefined : toMillis(raw.updatedAt),
      version: typeof raw.version === 'number' ? raw.version : undefined,
      props: unwrapAny(raw.props ?? raw.payload),
    };
    mirror.order.push(id);
  }
  return mirror;
}

export function latestDebugEntrySeq(entries: ChatDebugEntry[]): number {
  return entries.length > 0 ? entries[entries.length - 1].seq : 0;
}

export function foldTimelineMutationsFromDebugEntries(
  base: TimelineMirrorState,
  entries: ChatDebugEntry[],
  fromSeqExclusive: number,
): { mirror: TimelineMirrorState; lastSeq: number } {
  let lastSeq = fromSeqExclusive;
  for (const entry of entries) {
    if (entry.seq <= fromSeqExclusive) continue;
    lastSeq = Math.max(lastSeq, entry.seq);
  }
  return { mirror: base, lastSeq };
}
