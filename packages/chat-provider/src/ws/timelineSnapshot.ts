import { type TimelineEntity, timelineSlice } from '../store/timelineSlice';
import { type AppDispatch } from '../store/store';
import { type CanonicalFrame, type SnapshotEntityFrame, asString, unwrapAnyPayload } from './protocol';

export function messageEntity(id: string, props: Record<string, unknown>): TimelineEntity {
  return { id, kind: 'message', createdAt: Date.now(), updatedAt: Date.now(), props };
}

export function widgetEntity(id: string, props: Record<string, unknown>): TimelineEntity {
  return { id, kind: 'widget', createdAt: Date.now(), updatedAt: Date.now(), props };
}

export function toolCallEntity(id: string, props: Record<string, unknown>): TimelineEntity {
  return { id, kind: 'tool_call', createdAt: Date.now(), updatedAt: Date.now(), props };
}

export function timelineEntityFromSnapshotEntity(entity: SnapshotEntityFrame): TimelineEntity | null {
  const kind = asString(entity?.kind);
  const id = asString(entity?.id);
  const payload = unwrapAnyPayload(entity?.payload);
  if (!id) return null;

  if (kind === 'ChatMessage') {
    const messageId = asString(payload.messageId) || id;
    return messageEntity(messageId, {
      role: asString(payload.role) || 'assistant',
      prompt: asString(payload.prompt),
      content: asString(payload.content) || asString(payload.text),
      status: asString(payload.status) || 'idle',
      streaming: payload.streaming === true,
    });
  }

  if (kind === 'ChatWidgetInstance') {
    return widgetEntity(id, {
      instanceId: asString(payload.instanceId) || id,
      widgetName: asString(payload.widgetName),
      parentMessageId: asString(payload.parentMessageId),
      status: asString(payload.status) || 'READY',
      props: payload.props || {},
    });
  }

  if (kind === 'ChatFrontendToolCall') {
    return toolCallEntity(id, {
      toolCallId: asString(payload.toolCallId) || id,
      toolName: asString(payload.toolName),
      parentMessageId: asString(payload.parentMessageId),
      mode: asString(payload.mode),
      status: asString(payload.status) || 'requested',
      input: payload.input || {},
      result: payload.result || undefined,
      error: asString(payload.error),
    });
  }

  return { id, kind: kind || 'system', createdAt: Date.now(), updatedAt: Date.now(), props: payload };
}

export function applySnapshot(frame: CanonicalFrame, dispatch: AppDispatch, _sessionId = '') {
  dispatch(timelineSlice.actions.clear());
  const entities = Array.isArray(frame.entities) ? (frame.entities as SnapshotEntityFrame[]) : [];
  for (const entity of entities) {
    const mapped = timelineEntityFromSnapshotEntity(entity);
    if (!mapped) continue;
    dispatch(timelineSlice.actions.upsertEntity(mapped));
  }
}
