import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  useChatDebugEntries,
  type ChatDebugEntry,
  type ChatDebugEventStore,
  type ChatDebugFamily,
} from '@go-go-golems/chat-provider';
import { copyTextToClipboard } from './clipboard';
import { downloadTextFile } from './download';
import { sanitizeForExport } from './timelineDebugModel';
import { toYaml } from './yamlFormat';
import { SyntaxHighlight } from './SyntaxHighlight';

const DEFAULT_MAX_ENTRIES = 500;
const AUTO_SCROLL_THRESHOLD_PX = 32;
export const DEFAULT_CHAT_DEBUG_FAMILIES: ChatDebugFamily[] = ['llm', 'tool', 'widget', 'timeline', 'ws', 'raw', 'other'];

export const DEFAULT_CHAT_DEBUG_FAMILY_COLORS: Record<ChatDebugFamily, string> = {
  llm: '#3b82f6',
  tool: '#f59e0b',
  widget: '#8b5cf6',
  timeline: '#10b981',
  ws: '#ef4444',
  raw: '#64748b',
  other: '#6b7280',
};

export const DEFAULT_CHAT_DEBUG_FAMILY_LABELS: Record<ChatDebugFamily, string> = {
  llm: 'LLM',
  tool: 'Tool',
  widget: 'WID',
  timeline: 'TL',
  ws: 'WS',
  raw: 'Raw',
  other: '…',
};

export interface AutoScrollMetrics {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  thresholdPx?: number;
}

export function isNearBottom({
  scrollTop,
  clientHeight,
  scrollHeight,
  thresholdPx = AUTO_SCROLL_THRESHOLD_PX,
}: AutoScrollMetrics): boolean {
  return scrollHeight - (scrollTop + clientHeight) <= thresholdPx;
}

export interface EventTypeVisibilityOptions {
  hideTextPatch: boolean;
}

export function isEntryHiddenByEventType(eventType: string, options: EventTypeVisibilityOptions): boolean {
  return options.hideTextPatch && (eventType === 'ChatTextPatch' || eventType === '→ ChatTextPatch');
}

export function filterVisibleEntries(
  entries: ChatDebugEntry[],
  filters: Record<string, boolean>,
  options: EventTypeVisibilityOptions,
): ChatDebugEntry[] {
  return entries.filter((entry) => filters[entry.family] !== false && !isEntryHiddenByEventType(entry.eventType, options));
}

function toFileSafeSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'conversation';
}

export function buildVisibleEventsYamlExport(
  conversationId: string,
  visibleEntries: ChatDebugEntry[],
  exportedAtMs = Date.now(),
): { fileName: string; yaml: string } {
  const exportedAt = new Date(exportedAtMs).toISOString();
  const timestamp = exportedAt.replace(/[:.]/g, '-');
  return {
    fileName: `events-${toFileSafeSegment(conversationId)}-${timestamp}.yaml`,
    yaml: toYaml({
      conversationId,
      exportedAt,
      eventCount: visibleEntries.length,
      events: visibleEntries.map((entry) => ({
        timestamp: new Date(entry.at).toISOString(),
        eventType: entry.eventType,
        eventId: entry.eventId,
        family: entry.family,
        summary: entry.summary,
        payload: sanitizeForExport(entry.event),
      })),
    }),
  };
}

export interface ChatEventViewerProps {
  conversationId: string;
  entries: ChatDebugEntry[];
  onClear?: () => void;
  maxVisibleEntries?: number;
  defaultHiddenFamilies?: ChatDebugFamily[];
  defaultHideTextPatch?: boolean;
  familyLabels?: Partial<Record<ChatDebugFamily, string>>;
  familyColors?: Partial<Record<ChatDebugFamily, string>>;
}

export function ChatEventViewer({
  conversationId,
  entries,
  onClear,
  maxVisibleEntries = DEFAULT_MAX_ENTRIES,
  defaultHiddenFamilies = ['raw'],
  defaultHideTextPatch = false,
  familyLabels,
  familyColors,
}: ChatEventViewerProps) {
  const labels = useMemo(() => ({ ...DEFAULT_CHAT_DEBUG_FAMILY_LABELS, ...(familyLabels ?? {}) }), [familyLabels]);
  const colors = useMemo(() => ({ ...DEFAULT_CHAT_DEBUG_FAMILY_COLORS, ...(familyColors ?? {}) }), [familyColors]);
  const [filters, setFilters] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    for (const family of DEFAULT_CHAT_DEBUG_FAMILIES) next[family] = !defaultHiddenFamilies.includes(family);
    return next;
  });
  const [paused, setPaused] = useState(false);
  const [pausedEntries, setPausedEntries] = useState<ChatDebugEntry[] | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hideTextPatch, setHideTextPatch] = useState(defaultHideTextPatch);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copyFeedbackById, setCopyFeedbackById] = useState<Record<string, 'copied' | 'error'>>({});
  const [exportFeedback, setExportFeedback] = useState<'ok' | 'error' | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const displayedEntries = paused ? (pausedEntries ?? entries) : entries;
  const visible = useMemo(() => {
    const filtered = filterVisibleEntries(displayedEntries, filters, { hideTextPatch });
    return filtered.length > maxVisibleEntries ? filtered.slice(filtered.length - maxVisibleEntries) : filtered;
  }, [displayedEntries, filters, hideTextPatch, maxVisibleEntries]);

  useLayoutEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [visible.length, autoScroll]);

  const toggleFilter = useCallback((family: string) => {
    setFilters((current) => ({ ...current, [family]: !current[family] }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearLog = useCallback(() => {
    setPausedEntries(null);
    setExpandedIds(new Set());
    setCopyFeedbackById({});
    onClear?.();
  }, [onClear]);

  const togglePause = useCallback(() => {
    setPaused((current) => {
      const next = !current;
      setPausedEntries(next ? entries : null);
      return next;
    });
  }, [entries]);

  const handleLogScroll = useCallback(() => {
    if (autoScroll && logRef.current && !isNearBottom(logRef.current)) setAutoScroll(false);
  }, [autoScroll]);

  const copyPayload = useCallback((entryId: string, payloadText: string) => {
    copyTextToClipboard(payloadText)
      .then(() => setCopyFeedbackById((current) => ({ ...current, [entryId]: 'copied' })))
      .catch(() => setCopyFeedbackById((current) => ({ ...current, [entryId]: 'error' })))
      .finally(() => {
        setTimeout(() => {
          setCopyFeedbackById((current) => {
            if (!current[entryId]) return current;
            const next = { ...current };
            delete next[entryId];
            return next;
          });
        }, 1400);
      });
  }, []);

  const exportVisibleToYaml = useCallback(() => {
    try {
      const { fileName, yaml } = buildVisibleEventsYamlExport(conversationId, visible);
      downloadTextFile(fileName, yaml, 'text/yaml;charset=utf-8');
      setExportFeedback('ok');
    } catch {
      setExportFeedback('error');
    } finally {
      setTimeout(() => setExportFeedback(null), 1400);
    }
  }, [conversationId, visible]);

  return (
    <div data-part="event-viewer" style={rootStyle}>
      <div data-part="event-viewer-toolbar" style={toolbarStyle}>
        {DEFAULT_CHAT_DEBUG_FAMILIES.map((family) => (
          <button key={family} type="button" data-state={filters[family] ? 'active' : 'inactive'} onClick={() => toggleFilter(family)} style={pillStyle(family, filters[family] !== false, colors)}>
            {labels[family]}
          </button>
        ))}
        <label style={toggleLabelStyle} title="Hide ChatTextPatch streaming delta events">
          <input type="checkbox" checked={hideTextPatch} onChange={(event) => setHideTextPatch(event.target.checked)} />
          hide text deltas
        </label>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={exportVisibleToYaml} style={controlBtnStyle}>⬇ Export YAML</button>
        {exportFeedback === 'ok' && <span style={feedbackOkStyle}>Exported</span>}
        {exportFeedback === 'error' && <span style={feedbackErrorStyle}>Export failed</span>}
        <button type="button" onClick={togglePause} style={controlBtnStyle}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
        <button type="button" onClick={clearLog} style={controlBtnStyle}>🗑 Clear</button>
        {autoScroll ? (
          <button type="button" onClick={() => setAutoScroll(false)} style={controlBtnStyle}>⏸ Hold</button>
        ) : (
          <button type="button" onClick={() => { setAutoScroll(true); endRef.current?.scrollIntoView({ behavior: 'instant' }); }} style={controlBtnStyle}>▶ Follow Stream</button>
        )}
        <span style={summaryStyle}>{visible.length}/{displayedEntries.length}</span>
      </div>
      <div ref={logRef} data-part="event-viewer-log" onScroll={handleLogScroll} style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {visible.length === 0 && (
          <div style={emptyStyle}>{displayedEntries.length === 0 ? '📡 Waiting for events…' : `All ${displayedEntries.length} events are filtered out`}</div>
        )}
        {visible.map((entry) => (
          <EventRow
            key={entry.id}
            entry={entry}
            expanded={expandedIds.has(entry.id)}
            copyFeedback={copyFeedbackById[entry.id] ?? null}
            colors={colors}
            onToggle={toggleExpand}
            onCopy={copyPayload}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export interface ChatEventViewerFromStoreProps extends Omit<ChatEventViewerProps, 'entries' | 'onClear'> {
  store: ChatDebugEventStore;
}

export function ChatEventViewerFromStore({ store, conversationId, ...props }: ChatEventViewerFromStoreProps) {
  const entries = useChatDebugEntries(store, conversationId);
  const clear = useCallback(() => store.clear(conversationId), [store, conversationId]);
  return <ChatEventViewer {...props} conversationId={conversationId} entries={entries} onClear={clear} />;
}

const EventRow = memo(function EventRow({
  entry,
  expanded,
  copyFeedback,
  colors,
  onToggle,
  onCopy,
}: {
  entry: ChatDebugEntry;
  expanded: boolean;
  copyFeedback: 'copied' | 'error' | null;
  colors: Record<ChatDebugFamily, string>;
  onToggle: (id: string) => void;
  onCopy: (id: string, payloadText: string) => void;
}) {
  return (
    <div data-part="event-viewer-entry" data-family={entry.family} style={{ borderBottom: '1px solid #e5e5e5' }}>
      <button type="button" data-part="event-viewer-entry-header" onClick={() => onToggle(entry.id)} style={eventHeaderStyle}>
        <span style={{ color: '#999', fontSize: '10px', minWidth: '70px' }}>{formatTimestamp(entry.at)}</span>
        <span style={{ color: colors[entry.family] ?? '#6b7280', minWidth: '130px', fontWeight: 600 }}>{entry.eventType}</span>
        {entry.eventId && <span style={{ color: '#999', fontSize: '10px' }}>{entry.eventId.length > 12 ? `${entry.eventId.slice(0, 12)}…` : entry.eventId}</span>}
        <span style={{ color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{entry.summary}</span>
        <span style={{ color: '#bbb', fontSize: '10px' }}>{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && <EventRowPayload entry={entry} copyFeedback={copyFeedback} onCopy={onCopy} />}
    </div>
  );
});

function EventRowPayload({
  entry,
  copyFeedback,
  onCopy,
}: {
  entry: ChatDebugEntry;
  copyFeedback: 'copied' | 'error' | null;
  onCopy: (id: string, payloadText: string) => void;
}) {
  const payloadYaml = useMemo(() => toYaml(sanitizeForExport(entry.event)), [entry]);
  return (
    <div style={{ margin: '0 8px 4px 86px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 6px' }}>
        <button type="button" onClick={() => onCopy(entry.id, payloadYaml)} style={copyBtnStyle}>Copy Payload</button>
        {copyFeedback === 'copied' && <span style={feedbackOkStyle}>Copied</span>}
        {copyFeedback === 'error' && <span style={feedbackErrorStyle}>Copy failed</span>}
      </div>
      <SyntaxHighlight code={payloadYaml} language="yaml" variant="light" style={{ fontSize: 11, maxHeight: 300, userSelect: 'text' }} />
    </div>
  );
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().slice(11, 23);
}

function pillStyle(family: ChatDebugFamily, active: boolean, colors: Record<ChatDebugFamily, string>): CSSProperties {
  const color = colors[family] ?? '#6b7280';
  return {
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '3px',
    border: `1px solid ${color}`,
    background: active ? `${color}18` : 'transparent',
    color: active ? color : '#999',
    cursor: 'pointer',
  };
}

const rootStyle: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'monospace', fontSize: 12, color: '#333', background: '#fff' };
const toolbarStyle: CSSProperties = { display: 'flex', gap: 4, padding: '4px 8px', borderBottom: '1px solid #ddd', background: '#f8f9fa', flexWrap: 'wrap', alignItems: 'center' };
const eventHeaderStyle: CSSProperties = { display: 'flex', gap: '8px', padding: '3px 8px', cursor: 'pointer', alignItems: 'baseline', width: '100%', border: 0, background: 'transparent', font: 'inherit' };
const controlBtnStyle: CSSProperties = { padding: '2px 8px', fontSize: 11, borderRadius: 3, border: '1px solid #ccc', background: '#f0f0f0', color: '#555', cursor: 'pointer' };
const toggleLabelStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: '10px' };
const copyBtnStyle: CSSProperties = { padding: '1px 7px', fontSize: 10, borderRadius: 3, border: '1px solid #ccc', background: '#f0f0f0', color: '#333', cursor: 'pointer', lineHeight: 1 };
const feedbackOkStyle: CSSProperties = { color: '#10b981', fontSize: 10 };
const feedbackErrorStyle: CSSProperties = { color: '#ef4444', fontSize: 10 };
const summaryStyle: CSSProperties = { color: '#888', fontSize: 10 };
const emptyStyle: CSSProperties = { color: '#999', textAlign: 'center', padding: '24px', fontSize: 13 };
