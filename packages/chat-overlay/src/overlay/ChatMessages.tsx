import type { ReactNode, RefObject } from 'react';
import {
  useChatSelector,
  selectTimelineEntities,
  WidgetOutlet,
  ToolCallOutlet,
  type TimelineEntity,
} from '@go-go-golems/chat-provider';

export type ChatMessageRenderMode = 'normal' | 'compact' | 'debug';

export type TimelineEntityRendererContext = {
  entity: TimelineEntity;
  index: number;
  renderMode: ChatMessageRenderMode;
};

export type TimelineEntityRenderer = (context: TimelineEntityRendererContext) => ReactNode;

export interface ChatMessagesProps {
  bottomRef?: RefObject<HTMLDivElement | null>;
  renderMode?: ChatMessageRenderMode;
  renderers?: Record<string, TimelineEntityRenderer | undefined>;
  fallbackRenderer?: TimelineEntityRenderer;
  visibleKinds?: string[] | ((entity: TimelineEntity) => boolean);
  empty?: ReactNode;
}

function isVisibleEntity(entity: TimelineEntity, visibleKinds: ChatMessagesProps['visibleKinds']): boolean {
  if (!visibleKinds) return true;
  if (Array.isArray(visibleKinds)) return visibleKinds.includes(entity.kind);
  return visibleKinds(entity);
}

function DefaultMessageEntity({ entity }: { entity: TimelineEntity }) {
  const role = entity.props.role as string;
  const content = entity.props.content as string;
  const isUser = role === 'user';
  const isThinking = role === 'thinking';

  if (isThinking) {
    return (
      <div className="text-mac-gray-3 text-xs italic">
        {String(content ?? '')}
      </div>
    );
  }

  return (
    <div
      className={[
        'px-2 py-1.5 text-xs',
        isUser
          ? 'border-l-2 border-mac-black bg-mac-gray-5 text-mac-gray-1'
          : 'text-mac-black',
      ].join(' ')}
    >
      <span className="text-mac-gray-3 text-[10px] uppercase mr-1">
        {isUser ? 'you' : 'assistant'}
      </span>
      <div className="whitespace-pre-wrap break-words mt-0.5">
        {String(content ?? '')}
        {entity.props.streaming ? (<span className="cursor-blink">▌</span>) : null}
      </div>
    </div>
  );
}

function DefaultWidgetEntity({ entity }: { entity: TimelineEntity }) {
  return (
    <WidgetOutlet
      instanceId={(entity.props.instanceId as string) || entity.id}
      widgetName={(entity.props.widgetName as string) || 'unknown'}
      status={(entity.props.status as string) || 'READY'}
      props={(entity.props.props as Record<string, unknown>) || {}}
    />
  );
}

function DefaultToolCallEntity({ entity }: { entity: TimelineEntity }) {
  return (
    <ToolCallOutlet
      toolCallId={(entity.props.toolCallId as string) || entity.id}
      toolName={(entity.props.toolName as string) || 'unknown'}
      status={(entity.props.status as string) || 'requested'}
      input={entity.props.input as Record<string, unknown> | undefined}
      result={entity.props.result as Record<string, unknown> | undefined}
      error={entity.props.error as string | undefined}
    />
  );
}

export function RawTimelineEntityFallback({ entity, renderMode }: TimelineEntityRendererContext) {
  const body = renderMode === 'debug'
    ? JSON.stringify(entity, null, 2)
    : JSON.stringify({ id: entity.id, kind: entity.kind, props: entity.props }, null, 2);
  return (
    <details className="text-mac-gray-3 text-xs border border-mac-gray-4 bg-mac-gray-5 px-2 py-1">
      <summary className="cursor-pointer">
        {entity.kind || 'unknown'} · {entity.id}
      </summary>
      <pre className="mt-1 whitespace-pre-wrap break-words text-[10px]">{body}</pre>
    </details>
  );
}

export const defaultTimelineEntityRenderers: Record<string, TimelineEntityRenderer> = {
  message: ({ entity }) => <DefaultMessageEntity entity={entity} />,
  widget: ({ entity }) => <DefaultWidgetEntity entity={entity} />,
  tool_call: ({ entity }) => <DefaultToolCallEntity entity={entity} />,
};

function DefaultEmptyMessages({ bottomRef }: { bottomRef?: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="text-mac-gray-3 text-xs italic">
      No messages yet. Type something below.
      <div ref={bottomRef} />
    </div>
  );
}

export function ChatMessages({
  bottomRef,
  renderMode = 'normal',
  renderers,
  fallbackRenderer = RawTimelineEntityFallback,
  visibleKinds,
  empty,
}: ChatMessagesProps = {}) {
  const entities = useChatSelector(selectTimelineEntities);
  const visible = entities.filter((entity) => isVisibleEntity(entity, visibleKinds));
  const mergedRenderers = { ...defaultTimelineEntityRenderers, ...(renderers ?? {}) };

  if (visible.length === 0) {
    return empty ?? <DefaultEmptyMessages bottomRef={bottomRef} />;
  }

  return (
    <div className="space-y-2">
      {visible.map((entity, index) => {
        const renderer = mergedRenderers[entity.kind] ?? fallbackRenderer;
        return (
          <div key={entity.id} data-timeline-kind={entity.kind}>
            {renderer({ entity, index, renderMode })}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
