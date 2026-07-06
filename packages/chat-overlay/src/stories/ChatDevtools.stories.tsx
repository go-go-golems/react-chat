import type { Meta, StoryObj } from '@storybook/react';
import { ChatEventViewer, ChatTimelineDebug, ChatWindowChrome } from '../index';
import type { ChatDebugEntry, TimelineMirrorState } from '@go-go-golems/chat-provider';

const now = Date.parse('2026-01-01T12:00:00Z');

const entries: ChatDebugEntry[] = [
  {
    id: 'evt-1',
    seq: 1,
    at: now,
    family: 'ws',
    eventType: 'ws.connected',
    eventId: '',
    summary: 'ws connected',
    event: { type: 'ws-lifecycle', sessionId: 'demo', event: 'connected' },
  },
  {
    id: 'evt-2',
    seq: 2,
    at: now + 1,
    family: 'llm',
    eventType: 'ChatTextPatch',
    eventId: '#2',
    summary: 'ui-event ChatTextPatch #2',
    event: { type: 'parsed-frame', sessionId: 'demo', frameType: 'ui-event', name: 'ChatTextPatch', ordinal: 2, frame: { type: 'ui-event', name: 'ChatTextPatch' } },
  },
  {
    id: 'evt-3',
    seq: 3,
    at: now + 2,
    family: 'timeline',
    eventType: '→ ChatTextPatch',
    eventId: 'msg-1',
    summary: 'ui ChatTextPatch via chat-provider.message',
    event: { type: 'ui-event', sessionId: 'demo', name: 'ChatTextPatch', messageId: 'msg-1', mutation: { upsert: { id: 'msg-1', kind: 'message' } }, adapterName: 'chat-provider.message' },
  },
];

const timeline: TimelineMirrorState = {
  order: ['msg-1', 'widget-1'],
  byId: {
    'msg-1': { id: 'msg-1', kind: 'message', createdAt: now, props: { role: 'assistant', content: 'Hello from the devtools story.' } },
    'widget-1': { id: 'widget-1', kind: 'widget', createdAt: now + 10, props: { widgetName: 'DemoWidget', status: 'READY', props: { title: 'Inventory snapshot' } } },
  },
};

function DevtoolsDemo() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, height: 900 }}>
      <ChatWindowChrome
        title="Assistant"
        connectionStatus="connected"
        profileSlot={<span>gpt-5-nano-low</span>}
        toolbarSlot={<button type="button">Debug</button>}
        footerSlot={<div style={{ padding: 8 }}>Streaming via sessionstream</div>}
      >
        <div style={{ padding: 12 }}>Chat body slot</div>
      </ChatWindowChrome>
      <div style={{ height: 320, border: '1px solid #ddd' }}><ChatEventViewer conversationId="demo" entries={entries} /></div>
      <div style={{ height: 360, border: '1px solid #ddd' }}><ChatTimelineDebug conversationId="demo" timeline={timeline} /></div>
    </div>
  );
}

const meta: Meta<typeof DevtoolsDemo> = {
  title: 'Devtools/ChatDevtools',
  component: DevtoolsDemo,
};

export default meta;
type Story = StoryObj<typeof DevtoolsDemo>;

export const Default: Story = {};
