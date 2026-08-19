import type { TimelineEntity } from '../store/timelineSlice';
import { timelineSlice } from '../store/timelineSlice';
import type { AppDispatch } from '../store/store';
import { overlaySlice } from '../store/overlaySlice';
import type { ToolRuntime } from '../tools/toolRuntime';
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
  reconcileHydratedState(debugEntities, dispatch, toolRuntime);
  return debugEntities;
}

export function reconcileHydratedState(
  entities: SnapshotDebugEntity[],
  dispatch: AppDispatch,
  toolRuntime?: ToolRuntime,
): void {
  const mapped = entities.flatMap((entity) => entity.mapped ? [entity.mapped] : []);
  const messages = mapped.filter((entity) => entity.kind === 'message');
  const requestedTools = mapped
    .filter((entity) => entity.kind === 'tool_call' && String(entity.props.status || '').toLowerCase() === 'requested')
    .map((entity) => entity.props);

  const isStreaming = requestedTools.length > 0 || messages.some((entity) => (
    entity.props.streaming === true || String(entity.props.status || '').toLowerCase() === 'streaming'
  ));
  const hasFailure = messages.some((entity) => (
    entity.props.role === 'error' || String(entity.props.status || '').toLowerCase() === 'failed'
  ));
  const hasStopped = messages.some((entity) => String(entity.props.status || '').toLowerCase() === 'stopped');
  const runStatus = isStreaming ? 'streaming' : hasFailure ? 'failed' : hasStopped ? 'stopped' : messages.length > 0 ? 'finished' : 'idle';

  dispatch(overlaySlice.actions.setRunStatus(runStatus));
  toolRuntime?.reconcileFrontendToolRequests(requestedTools);
}
