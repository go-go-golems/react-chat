import type { CSSProperties, ReactNode } from 'react';

export interface ChatWindowChromeProps {
  title: ReactNode;
  connectionStatus?: ReactNode;
  profileSlot?: ReactNode;
  toolbarSlot?: ReactNode;
  debugSlot?: ReactNode;
  footerSlot?: ReactNode;
  children: ReactNode;
}

export function ChatWindowChrome({
  title,
  connectionStatus,
  profileSlot,
  toolbarSlot,
  debugSlot,
  footerSlot,
  children,
}: ChatWindowChromeProps) {
  return (
    <div data-part="chat-window-chrome" style={rootStyle}>
      <header data-part="chat-window-chrome-header" style={headerStyle}>
        <div data-part="chat-window-chrome-title" style={titleStyle}>{title}</div>
        {profileSlot ? <div data-part="chat-window-chrome-profile">{profileSlot}</div> : null}
        {connectionStatus ? <div data-part="chat-window-chrome-status" style={statusStyle}>{connectionStatus}</div> : null}
        {toolbarSlot ? <div data-part="chat-window-chrome-toolbar" style={toolbarStyle}>{toolbarSlot}</div> : null}
      </header>
      {debugSlot ? <div data-part="chat-window-chrome-debug" style={debugStyle}>{debugSlot}</div> : null}
      <main data-part="chat-window-chrome-body" style={bodyStyle}>{children}</main>
      {footerSlot ? <footer data-part="chat-window-chrome-footer" style={footerStyle}>{footerSlot}</footer> : null}
    </div>
  );
}

const rootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  background: 'var(--chat-window-bg, #fff)',
  color: 'var(--chat-window-fg, #111)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  borderBottom: '1px solid var(--chat-window-border, #d1d5db)',
  background: 'var(--chat-window-header-bg, #f8f9fa)',
};

const titleStyle: CSSProperties = { fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const statusStyle: CSSProperties = { fontSize: 11, color: 'var(--chat-window-muted-fg, #6b7280)' };
const toolbarStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' };
const debugStyle: CSSProperties = { borderBottom: '1px solid var(--chat-window-border, #d1d5db)' };
const bodyStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: 'auto' };
const footerStyle: CSSProperties = { borderTop: '1px solid var(--chat-window-border, #d1d5db)' };
