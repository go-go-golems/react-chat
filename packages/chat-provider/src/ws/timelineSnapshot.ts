import type { TimelineEntity } from '../store/timelineSlice';
import { timelineSlice } from '../store/timelineSlice';
import type { AppDispatch } from '../store/store';
import { asString, type CanonicalFrame, type SnapshotEntityFrame, unwrapAnyPayload } from './protocol';
import { applyTimelineMutation } from './timelineEvents';
import type { TimelineAdapterRegistry } from './timelineAdapterRegistry';

export function messageEntity(id: string, props: Record<string, unknown>): TimelineEntity {
  return { id, kind: 'message', createdAt: Date.now(), updatedAt: Date.now(), props };
}

export function widgetEntity(id: string, props: Record<string, unknown>): TimelineEntity {
  return { id, kind: 'widget', createdAt: Date.now(), updatedAt: Date.now(), props };
}

export function toolCallEntity(id: string, props: Record<string, unknown>): TimelineEntity {
  return { id, kind: 'tool_call', createdAt: Date.now(), updatedAt: Date.now(), props };
}

export type SnapshotDebugEntity = { raw: SnapshotEntityFrame; mapped: TimelineEntity | null; adapterName?: string };

export function normalizeSnapshotEntity(entity: SnapshotEntityFrame): SnapshotEntityFrame {
  return {
    ...entity,
    kind: asString(entity?.kind),
    id: asString(entity?.id),
    payload: unwrapAnyPayload(entity?.payload),
  };
}

export function applySnapshot(
  frame: CanonicalFrame,
  dispatch: AppDispatch,
  sessionId = '',
  adapterRegistry?: TimelineAdapterRegistry,
): SnapshotDebugEntity[] {
  dispatch(timelineSlice.actions.clear());
  const entities = Array.isArray(frame.entities) ? (frame.entities as SnapshotEntityFrame[]) : [];
  const debugEntities: SnapshotDebugEntity[] = [];
  for (const raw of entities) {
    const entity = normalizeSnapshotEntity(raw);
    const projection = adapterRegistry?.projectSnapshot(entity, { sessionId, snapshotOrdinal: frame.ordinal }) ?? null;
    const mapped = projection?.mutation.upsert ?? projection?.mutation.upsertIfExists ?? null;
    debugEntities.push({ raw, mapped, adapterName: projection?.adapterName });
    if (!projection) continue;
    applyTimelineMutation(dispatch, projection.mutation);
  }
  return debugEntities;
}
