import type { TimelineEntity } from '../store/timelineSlice';
import { timelineSlice } from '../store/timelineSlice';
import type { AppDispatch } from '../store/store';
import { overlaySlice } from '../store/overlaySlice';
import type { ToolRuntime } from '../tools/toolRuntime';
import { asString, compareEventOrdinals, safeOrdinal, type CanonicalFrame, type SnapshotEntityFrame, unwrapAnyPayload, ZERO_ORDINAL } from './protocol';
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
  toolRuntime?: ToolRuntime,
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
  reconcileHydratedState(debugEntities, dispatch, toolRuntime, sessionId);
  return debugEntities;
}

export function reconcileHydratedState(
  entities: SnapshotDebugEntity[],
  dispatch: AppDispatch,
  toolRuntime?: ToolRuntime,
  sessionId = '',
): void {
  const mapped = entities.flatMap((entity) => entity.mapped ? [entity.mapped] : []);
  const messages = entities
    .map((entity, index) => ({
      entity: entity.mapped,
      index,
      ordinal: safeOrdinal(entity.raw.lastEventOrdinal) ?? safeOrdinal(entity.raw.createdOrdinal) ?? ZERO_ORDINAL,
    }))
    .filter((entry): entry is { entity: TimelineEntity; index: number; ordinal: typeof ZERO_ORDINAL } => entry.entity?.kind === 'message');
  const requestedTools = mapped
    .filter((entity) => entity.kind === 'tool_call' && String(entity.props.status || '').toLowerCase() === 'requested')
    .map((entity) => entity.props);

  const latestMessage = messages.reduce<(typeof messages)[number] | null>((latest, candidate) => {
    if (!latest) return candidate;
    const ordinalOrder = compareEventOrdinals(candidate.ordinal, latest.ordinal);
    return ordinalOrder > 0 || (ordinalOrder === 0 && candidate.index > latest.index) ? candidate : latest;
  }, null)?.entity;
  const latestStatus = String(latestMessage?.props.status || '').toLowerCase();
  const isStreaming = requestedTools.length > 0
    || latestMessage?.props.streaming === true
    || ['streaming', 'accepted', 'requested'].includes(latestStatus);
  const runStatus = isStreaming
    ? 'streaming'
    : latestMessage?.props.role === 'error' || latestStatus === 'failed'
      ? 'failed'
      : latestStatus === 'stopped'
        ? 'stopped'
        : latestMessage
          ? 'finished'
          : 'idle';

  dispatch(overlaySlice.actions.setRunStatus(runStatus));
  toolRuntime?.reconcileFrontendToolRequests(requestedTools, sessionId);
}
