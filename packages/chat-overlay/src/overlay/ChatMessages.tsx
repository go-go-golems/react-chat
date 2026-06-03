import type { RefObject } from 'react';
import { useChatSelector, selectTimelineEntities } from '@go-go-golems/chat-provider';
import { WidgetOutlet } from '@go-go-golems/chat-provider';
import { ToolCallOutlet } from '@go-go-golems/chat-provider';

export function ChatMessages({ bottomRef }: { bottomRef?: RefObject<HTMLDivElement | null> } = {}) {
  const entities = useChatSelector(selectTimelineEntities);

  // Filter to user-visible timeline entities only
  const visible = entities.filter(
    (e) => e.kind === 'message' || e.kind === 'widget' || e.kind === 'tool_call',
  );

  if (visible.length === 0) {
    return (
      <div className="text-mac-gray-3 text-xs italic">
        No messages yet. Type something below.
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((entity) => {
        if (entity.kind === 'widget') {
          return (
            <WidgetOutlet
              key={entity.id}
              instanceId={(entity.props.instanceId as string) || entity.id}
              widgetName={(entity.props.widgetName as string) || 'unknown'}
              status={(entity.props.status as string) || 'READY'}
              props={(entity.props.props as Record<string, unknown>) || {}}
            />
          );
        }

        if (entity.kind === 'tool_call') {
          return (
            <ToolCallOutlet
              key={entity.id}
              toolCallId={(entity.props.toolCallId as string) || entity.id}
              toolName={(entity.props.toolName as string) || 'unknown'}
              status={(entity.props.status as string) || 'requested'}
              input={entity.props.input as Record<string, unknown> | undefined}
              result={entity.props.result as Record<string, unknown> | undefined}
              error={entity.props.error as string | undefined}
            />
          );
        }

        const role = entity.props.role as string;
        const content = entity.props.content as string;
        const isUser = role === 'user';
        const isThinking = role === 'thinking';

        if (isThinking) {
          return (
            <div key={entity.id} className="text-mac-gray-3 text-xs italic">
              {String(content)}
            </div>
          );
        }

        return (
          <div
            key={entity.id}
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
              {String(content)}
              {entity.props.streaming ? (<span className="cursor-blink">▌</span>) : null}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
