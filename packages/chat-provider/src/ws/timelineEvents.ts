import { type TimelineEntity, timelineSlice } from '../store/timelineSlice';
import { overlaySlice } from '../store/overlaySlice';
import type { AppDispatch } from '../store/store';
import { messageEntity, toolCallEntity, widgetEntity } from './timelineSnapshot';
import type { CanonicalFrame } from './protocol';
import type { ToolRuntime } from '../tools/toolRuntime';

type TimelineMutation = {
  upsert?: TimelineEntity;
  upsertIfExists?: TimelineEntity;
  deleteId?: string;
  status?: string;
};

function patchModeName(mode: unknown): string {
  if (typeof mode === 'string' && mode.trim()) return mode;
  return 'CHAT_STREAM_PATCH_MODE_APPEND';
}

function definedProps(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined && !(typeof value === 'string' && value === '')),
  );
}

function parentMessageId(messageId: string, marker: string): string | undefined {
  const idx = messageId.lastIndexOf(marker);
  return idx > 0 ? messageId.slice(0, idx) : undefined;
}

export function timelineMutationFromUIEvent(frame: CanonicalFrame): TimelineMutation | null {
  const name = (frame as any).name as string;
  const payload = ((frame as any).payload as Record<string, unknown>) || {};

  switch (name) {
    case 'ChatUserMessageAccepted': {
      const messageId = payload.messageId as string;
      if (!messageId) return null;
      return {
        upsert: messageEntity(messageId, {
          role: payload.role || 'user',
          content: payload.content || payload.text,
          status: payload.status || 'accepted',
          streaming: false,
        }),
      };
    }
    case 'ChatRunStarted':
      return { status: 'streaming' };
    case 'ChatRunFinished':
      return { status: (payload.status as string) || 'finished' };
    case 'ChatRunStopped':
      return { status: (payload.status as string) || 'stopped' };
    case 'ChatRunFailed':
      return { status: (payload.status as string) || 'failed' };
    case 'ChatTextSegmentStarted':
      return { status: 'streaming' };
    case 'ChatTextPatch': {
      const messageId = payload.messageId as string;
      if (!messageId) return null;
      return {
        upsert: messageEntity(messageId, {
          role: payload.role || 'assistant',
          contentPatch: payload.text || payload.content || '',
          patchMode: patchModeName(payload.mode),
          status: payload.status || 'streaming',
          streaming: !(payload as any).final,
          parentMessageId: parentMessageId(messageId, ':text:'),
        }),
        status: 'streaming',
      };
    }
    case 'ChatTextSegmentFinished': {
      const messageId = payload.messageId as string;
      if (!messageId) return null;
      const content = payload.content || payload.text;
      const upsert = messageEntity(
        messageId,
        definedProps({
          role: payload.role || 'assistant',
          ...(content ? { content } : {}),
          status: payload.status || 'finished',
          streaming: false,
          parentMessageId: parentMessageId(messageId, ':text:'),
          ...(payload.final ? { final: payload.final } : {}),
        }),
      );
      return {
        ...(content ? { upsert } : { upsertIfExists: upsert }),
        status: (payload.status as string) || 'finished',
      };
    }
    case 'ChatWidgetInstanceStarted': {
      const instanceId = payload.instanceId as string;
      if (!instanceId) return null;
      return {
        upsert: widgetEntity(instanceId, {
          instanceId,
          widgetName: payload.widgetName,
          parentMessageId: payload.parentMessageId,
          status: payload.status || 'STREAMING',
          props: payload.props || {},
        }),
      };
    }
    case 'ChatWidgetInstancePatched': {
      const instanceId = payload.instanceId as string;
      if (!instanceId) return null;
      return {
        upsert: widgetEntity(instanceId, {
          instanceId,
          widgetName: payload.widgetName,
          status: payload.status || 'STREAMING',
          propsPatch: payload.patch || {},
          patchPaths: payload.patchPaths || [],
        }),
      };
    }
    case 'ChatWidgetInstanceCompleted': {
      const instanceId = payload.instanceId as string;
      if (!instanceId) return null;
      return {
        upsert: widgetEntity(instanceId, {
          instanceId,
          status: payload.status || 'READY',
        }),
      };
    }
    case 'ChatWidgetInstanceRemoved': {
      const instanceId = payload.instanceId as string;
      if (!instanceId) return null;
      return { deleteId: instanceId };
    }
    case 'ChatFrontendToolCallRequested': {
      const toolCallId = payload.toolCallId as string;
      if (!toolCallId) return null;
      return {
        upsert: toolCallEntity(toolCallId, {
          toolCallId,
          toolName: payload.toolName,
          parentMessageId: payload.messageId,
          mode: payload.mode,
          status: payload.status || 'requested',
          input: payload.input || {},
        }),
      };
    }
    case 'ChatFrontendToolResultReceived': {
      const toolCallId = payload.toolCallId as string;
      if (!toolCallId) return null;
      return {
        upsert: toolCallEntity(toolCallId, {
          toolCallId,
          toolName: payload.toolName,
          parentMessageId: payload.messageId,
          status: payload.status || 'success',
          result: payload.result || {},
          error: payload.error,
        }),
      };
    }
    default:
      return null;
  }
}

export function applyUIEvent(frame: CanonicalFrame, dispatch: AppDispatch, _sessionId = '', toolRuntime?: ToolRuntime) {
  toolRuntime?.handleFrontendToolUIEvent(frame);
  const mutation = timelineMutationFromUIEvent(frame);
  if (!mutation) return;
  if (mutation.deleteId) {
    dispatch(timelineSlice.actions.deleteEntity(mutation.deleteId));
  }
  if (mutation.upsert) {
    dispatch(timelineSlice.actions.upsertEntity(mutation.upsert));
  }
  if (mutation.upsertIfExists) {
    dispatch(timelineSlice.actions.upsertEntityIfExists(mutation.upsertIfExists));
  }
  if (mutation.status) {
    dispatch(overlaySlice.actions.setRunStatus(mutation.status));
  }
}
