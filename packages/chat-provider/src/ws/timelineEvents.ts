import { overlaySlice } from '../store/overlaySlice';
import { timelineSlice } from '../store/timelineSlice';
import type { AppDispatch } from '../store/store';
import type { ToolRuntime } from '../tools/toolRuntime';
import type { CanonicalFrame } from './protocol';
import { asString } from './protocol';
import { messageEntity, toolCallEntity, widgetEntity } from './timelineSnapshot';
import {
  defineHydrateOnlyAdapter,
  defineLiveAndHydrateAdapter,
  defineLiveOnlyAdapter,
  type TimelineAdapter,
  type TimelineAdapterRegistry,
  type TimelineMutation,
  type TimelineProjectionResult,
} from './timelineAdapterRegistry';

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

function frameName(frame: CanonicalFrame): string {
  return asString(frame.name);
}

function framePayload(frame: CanonicalFrame): Record<string, unknown> {
  return ((frame as any).payload as Record<string, unknown>) || {};
}

export const runStatusTimelineAdapter = defineLiveOnlyAdapter({
  name: 'chat-provider.run-status',
  priority: 0,
  hydrationUnsupportedReason: 'Run status is derived from hydrated message entities and live run events.',
  live: {
    accepts: (frame) => ['ChatRunStarted', 'ChatRunFinished', 'ChatRunStopped', 'ChatRunFailed'].includes(frameName(frame)),
    project(frame): TimelineMutation | null {
      const name = frameName(frame);
      const payload = framePayload(frame);
      switch (name) {
        case 'ChatRunStarted':
          return { status: 'streaming' };
        case 'ChatRunFinished':
          return { status: (payload.status as string) || 'finished' };
        case 'ChatRunStopped':
          return { status: (payload.status as string) || 'stopped' };
        case 'ChatRunFailed':
          return { status: (payload.status as string) || 'failed' };
        default:
          return null;
      }
    },
  },
});

export const messageTimelineAdapter = defineLiveAndHydrateAdapter({
  name: 'chat-provider.message',
  priority: 0,
  live: {
    accepts: (frame) => ['ChatUserMessageAccepted', 'ChatTextSegmentStarted', 'ChatTextPatch', 'ChatTextSegmentFinished'].includes(frameName(frame)),
    project(frame): TimelineMutation | null {
      const name = frameName(frame);
      const payload = framePayload(frame);
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
        default:
          return null;
      }
    },
  },
  hydrate: {
    kind: 'supported',
    project(entity) {
      if (asString(entity.kind) !== 'ChatMessage') return null;
      const id = asString(entity.id);
      const payload = ((entity as any).payload ?? {}) as Record<string, unknown>;
      const messageId = asString(payload.messageId) || id;
      if (!messageId) return null;
      return messageEntity(messageId, {
        role: asString(payload.role) || 'assistant',
        prompt: asString(payload.prompt),
        content: asString(payload.content) || asString(payload.text),
        status: asString(payload.status) || 'idle',
        streaming: payload.streaming === true,
      });
    },
  },
});

export const widgetTimelineAdapter = defineLiveAndHydrateAdapter({
  name: 'chat-provider.widget',
  priority: 0,
  live: {
    accepts: (frame) => ['ChatWidgetInstanceStarted', 'ChatWidgetInstancePatched', 'ChatWidgetInstanceCompleted', 'ChatWidgetInstanceRemoved'].includes(frameName(frame)),
    project(frame): TimelineMutation | null {
      const name = frameName(frame);
      const payload = framePayload(frame);
      const instanceId = payload.instanceId as string;
      if (!instanceId) return null;
      switch (name) {
        case 'ChatWidgetInstanceStarted':
          return {
            upsert: widgetEntity(instanceId, {
              instanceId,
              widgetName: payload.widgetName,
              parentMessageId: payload.parentMessageId,
              status: payload.status || 'STREAMING',
              props: payload.props || {},
            }),
          };
        case 'ChatWidgetInstancePatched':
          return {
            upsert: widgetEntity(instanceId, {
              instanceId,
              widgetName: payload.widgetName,
              status: payload.status || 'STREAMING',
              propsPatch: payload.patch || {},
              patchPaths: payload.patchPaths || [],
            }),
          };
        case 'ChatWidgetInstanceCompleted':
          return {
            upsert: widgetEntity(instanceId, {
              instanceId,
              status: payload.status || 'READY',
            }),
          };
        case 'ChatWidgetInstanceRemoved':
          return { deleteId: instanceId };
        default:
          return null;
      }
    },
  },
  hydrate: {
    kind: 'supported',
    project(entity) {
      if (asString(entity.kind) !== 'ChatWidgetInstance') return null;
      const id = asString(entity.id);
      const payload = ((entity as any).payload ?? {}) as Record<string, unknown>;
      if (!id) return null;
      return widgetEntity(id, {
        instanceId: asString(payload.instanceId) || id,
        widgetName: asString(payload.widgetName),
        parentMessageId: asString(payload.parentMessageId),
        status: asString(payload.status) || 'READY',
        props: payload.props || {},
      });
    },
  },
});

export const frontendToolTimelineAdapter = defineLiveAndHydrateAdapter({
  name: 'chat-provider.frontend-tool',
  priority: 0,
  live: {
    accepts: (frame) => ['ChatFrontendToolCallRequested', 'ChatFrontendToolResultReceived'].includes(frameName(frame)),
    project(frame): TimelineMutation | null {
      const name = frameName(frame);
      const payload = framePayload(frame);
      const toolCallId = payload.toolCallId as string;
      if (!toolCallId) return null;
      switch (name) {
        case 'ChatFrontendToolCallRequested':
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
        case 'ChatFrontendToolResultReceived':
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
        default:
          return null;
      }
    },
  },
  hydrate: {
    kind: 'supported',
    project(entity) {
      if (asString(entity.kind) !== 'ChatFrontendToolCall') return null;
      const id = asString(entity.id);
      const payload = ((entity as any).payload ?? {}) as Record<string, unknown>;
      if (!id) return null;
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
    },
  },
});

export const unknownSnapshotTimelineAdapter = defineHydrateOnlyAdapter({
  name: 'chat-provider.unknown-snapshot',
  priority: 1000,
  hydrate: {
    kind: 'supported',
    project(entity) {
      const id = asString(entity.id);
      if (!id) return null;
      return { id, kind: asString(entity.kind) || 'system', createdAt: Date.now(), updatedAt: Date.now(), props: ((entity as any).payload ?? {}) as Record<string, unknown> };
    },
  },
});

export const coreTimelineAdapters: TimelineAdapter[] = [
  runStatusTimelineAdapter,
  messageTimelineAdapter,
  widgetTimelineAdapter,
  frontendToolTimelineAdapter,
  unknownSnapshotTimelineAdapter,
];

export function applyTimelineMutation(dispatch: AppDispatch, mutation: TimelineMutation) {
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

export function applyUIEvent(
  frame: CanonicalFrame,
  dispatch: AppDispatch,
  sessionId = '',
  toolRuntime?: ToolRuntime,
  adapterRegistry?: TimelineAdapterRegistry,
): TimelineProjectionResult | null {
  toolRuntime?.handleFrontendToolUIEvent(frame);
  const projection = adapterRegistry?.projectLive(frame, { sessionId, toolRuntime }) ?? null;
  if (!projection) return null;
  applyTimelineMutation(dispatch, projection.mutation);
  return projection;
}
