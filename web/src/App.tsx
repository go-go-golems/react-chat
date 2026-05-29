import { ChatOverlayProvider, ChatPanel, ChatBubble } from './core/index';
import './ecommerce'; // register ecommerce widgets

export default function App() {
  return (
    <ChatOverlayProvider config={{ basePrefix: '' }}>
      <div className="min-h-screen bg-mac-gray-5 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2 font-mono">Chat Overlay</h1>
          <p className="text-sm text-mac-gray-2 mb-6">
            Type a message to start a conversation. Try: "show me boots", "review my cart", or "checkout".
          </p>
        </div>
      </div>
      <ChatPanel />
      <ChatBubble />
    </ChatOverlayProvider>
  );
}
