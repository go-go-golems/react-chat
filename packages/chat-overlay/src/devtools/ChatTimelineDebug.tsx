import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import type { TimelineMirrorState } from '@go-go-golems/chat-provider';
import { copyTextToClipboard } from './clipboard';
import { downloadTextFile } from './download';
import { StructuredDataTree } from './StructuredDataTree';
import { SyntaxHighlight } from './SyntaxHighlight';
import {
  buildConversationYamlForCopy,
  buildEntityYamlForCopy,
  buildTimelineDebugSnapshot,
  buildTimelineYamlExport,
  sanitizeForExport,
  type TimelineDebugEntitySnapshot,
} from './timelineDebugModel';

export interface ChatTimelineDebugProps {
  conversationId: string;
  timeline: TimelineMirrorState;
  title?: string;
  selectedEntityId?: string | null;
  onSelectedEntityIdChange?: (id: string | null) => void;
  sanitize?: (value: unknown) => unknown;
}

export function ChatTimelineDebug({
  conversationId,
  timeline,
  title,
  selectedEntityId,
  onSelectedEntityIdChange,
  sanitize = sanitizeForExport,
}: ChatTimelineDebugProps) {
  const snapshot = useMemo(() => buildTimelineDebugSnapshot(conversationId, timeline), [conversationId, timeline]);
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'yaml'>('tree');
  const [copyConvFeedback, setCopyConvFeedback] = useState<'ok' | 'error' | null>(null);
  const [exportFeedback, setExportFeedback] = useState<'ok' | 'error' | null>(null);
  const [entityCopyFeedback, setEntityCopyFeedback] = useState<Record<string, 'ok' | 'error'>>({});

  const actualSelectedId = selectedEntityId !== undefined ? selectedEntityId : uncontrolledSelectedId;
  const setSelectedId = useCallback((id: string | null) => {
    if (selectedEntityId === undefined) setUncontrolledSelectedId(id);
    onSelectedEntityIdChange?.(id);
  }, [onSelectedEntityIdChange, selectedEntityId]);

  const selectedEntity = useMemo(() => {
    if (!actualSelectedId) return null;
    return snapshot.timeline.entities.find((entity) => entity.id === actualSelectedId) ?? null;
  }, [actualSelectedId, snapshot]);

  const copyConversation = useCallback(() => {
    const yaml = buildConversationYamlForCopy(snapshot);
    copyTextToClipboard(yaml)
      .then(() => setCopyConvFeedback('ok'))
      .catch(() => setCopyConvFeedback('error'))
      .finally(() => setTimeout(() => setCopyConvFeedback(null), 1400));
  }, [snapshot]);

  const exportYaml = useCallback(() => {
    try {
      const { fileName, yaml } = buildTimelineYamlExport(snapshot);
      downloadTextFile(fileName, yaml, 'text/yaml;charset=utf-8');
      setExportFeedback('ok');
    } catch {
      setExportFeedback('error');
    } finally {
      setTimeout(() => setExportFeedback(null), 1400);
    }
  }, [snapshot]);

  const copyEntity = useCallback((entity: TimelineDebugEntitySnapshot) => {
    const yaml = buildEntityYamlForCopy({ ...entity, props: sanitize(entity.props) }, conversationId);
    copyTextToClipboard(yaml)
      .then(() => setEntityCopyFeedback((current) => ({ ...current, [entity.id]: 'ok' })))
      .catch(() => setEntityCopyFeedback((current) => ({ ...current, [entity.id]: 'error' })))
      .finally(() => {
        setTimeout(() => {
          setEntityCopyFeedback((current) => {
            const next = { ...current };
            delete next[entity.id];
            return next;
          });
        }, 1400);
      });
  }, [conversationId, sanitize]);

  return (
    <div data-part="timeline-debug" style={rootStyle}>
      <div data-part="timeline-debug-toolbar" style={toolbarStyle}>
        {title && <strong style={{ color: '#555', marginRight: 8 }}>{title}</strong>}
        <button type="button" onClick={copyConversation} style={controlBtnStyle}>📋 Copy Conversation</button>
        {copyConvFeedback === 'ok' && <span style={feedbackOkStyle}>Copied</span>}
        {copyConvFeedback === 'error' && <span style={feedbackErrorStyle}>Copy failed</span>}
        <button type="button" onClick={exportYaml} style={controlBtnStyle}>⬇ Export YAML</button>
        {exportFeedback === 'ok' && <span style={feedbackOkStyle}>Exported</span>}
        {exportFeedback === 'error' && <span style={feedbackErrorStyle}>Export failed</span>}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => setViewMode((mode) => (mode === 'tree' ? 'yaml' : 'tree'))} style={controlBtnStyle}>
          {viewMode === 'tree' ? '📄 YAML' : '🌳 Tree'}
        </button>
        <span style={summaryStyle}>{summaryLabel(snapshot.summary.entityCount, snapshot.summary.kinds)}</span>
      </div>
      <div style={bodyStyle}>
        <div data-part="timeline-debug-list" style={listPaneStyle}>
          {snapshot.timeline.entities.length === 0 && <div style={emptyStyle}>Empty timeline</div>}
          {snapshot.timeline.entities.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              selected={entity.id === actualSelectedId}
              copyFeedback={entityCopyFeedback[entity.id] ?? null}
              onSelect={() => setSelectedId(entity.id === actualSelectedId ? null : entity.id)}
              onCopy={() => copyEntity(entity)}
            />
          ))}
        </div>
        <div data-part="timeline-debug-detail" style={detailPaneStyle}>
          {selectedEntity ? (
            <EntityDetail
              entity={selectedEntity}
              viewMode={viewMode}
              conversationId={conversationId}
              copyFeedback={entityCopyFeedback[selectedEntity.id] ?? null}
              sanitize={sanitize}
              onCopy={() => copyEntity(selectedEntity)}
            />
          ) : (
            <div style={emptyStyle}>Select an entity to inspect</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntityRow({
  entity,
  selected,
  copyFeedback,
  onSelect,
  onCopy,
}: {
  entity: TimelineDebugEntitySnapshot;
  selected: boolean;
  copyFeedback: 'ok' | 'error' | null;
  onSelect: () => void;
  onCopy: () => void;
}) {
  return (
    <div data-part="timeline-debug-entity-row" data-state={selected ? 'selected' : undefined} style={{ ...entityRowStyle, background: selected ? '#0000000a' : 'transparent' }}>
      <button type="button" onClick={onSelect} style={entitySelectStyle}>
        <span style={{ color: '#999', fontSize: 10, minWidth: 24, textAlign: 'right' }}>{entity.orderIndex}</span>
        <span style={{ color: kindColor(entity.kind), fontWeight: 600, minWidth: 100, fontSize: 11 }}>{entity.kind}</span>
        <span style={{ color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, textAlign: 'left' }}>{entity.id}</span>
        <span style={{ color: '#999', fontSize: 9, minWidth: 70 }}>{entity.createdAt ? formatTimestamp(entity.createdAt) : '—'}</span>
      </button>
      <button type="button" onClick={onCopy} style={copyBtnStyle}>{copyFeedback === 'ok' ? '✅' : copyFeedback === 'error' ? '⚠' : '📋'}</button>
    </div>
  );
}

function EntityDetail({
  entity,
  viewMode,
  conversationId,
  copyFeedback,
  sanitize,
  onCopy,
}: {
  entity: TimelineDebugEntitySnapshot;
  viewMode: 'tree' | 'yaml';
  conversationId: string;
  copyFeedback: 'ok' | 'error' | null;
  sanitize: (value: unknown) => unknown;
  onCopy: () => void;
}) {
  const sanitizedProps = useMemo(() => sanitize(entity.props), [entity, sanitize]);
  const yaml = useMemo(
    () => (viewMode === 'yaml' ? buildEntityYamlForCopy({ ...entity, props: sanitizedProps }, conversationId) : ''),
    [conversationId, entity, sanitizedProps, viewMode],
  );
  return (
    <div style={{ padding: '4px 8px', overflow: 'auto', height: '100%' }}>
      <div style={detailToolbarStyle}>
        <button type="button" onClick={onCopy} style={controlBtnStyle}>📋 Copy Payload</button>
        {copyFeedback === 'ok' && <span style={feedbackOkStyle}>Copied</span>}
        {copyFeedback === 'error' && <span style={feedbackErrorStyle}>Copy failed</span>}
      </div>
      {viewMode === 'yaml' ? (
        <SyntaxHighlight code={yaml} language="yaml" variant="light" style={{ fontSize: 11, maxHeight: 'none', userSelect: 'text' }} />
      ) : (
        <>
          <div style={{ marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
            <span><b style={{ color: '#7c3aed' }}>id:</b> <span style={{ color: '#0550ae' }}>{entity.id}</span></span>
            <span><b style={{ color: '#7c3aed' }}>kind:</b> <span style={{ color: kindColor(entity.kind) }}>{entity.kind}</span></span>
            <span><b style={{ color: '#7c3aed' }}>index:</b> <span style={{ color: '#0969da' }}>{entity.orderIndex}</span></span>
            {entity.version !== null && <span><b style={{ color: '#7c3aed' }}>v:</b> <span style={{ color: '#0969da' }}>{entity.version}</span></span>}
          </div>
          <StructuredDataTree data={sanitizedProps} label="props" defaultCollapsed={false} />
        </>
      )}
    </div>
  );
}

function summaryLabel(entityCount: number, kinds: Record<string, number>): string {
  const kindPart = Object.entries(kinds).map(([kind, count]) => `${kind}: ${count}`).join(', ');
  return `${entityCount} entities${kindPart ? ` · ${kindPart}` : ''}`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().slice(11, 23);
}

const KIND_COLORS: Record<string, string> = { message: '#3b82f6', widget: '#8b5cf6', tool_call: '#f59e0b', suggestions: '#6366f1' };
function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? '#6b7280';
}

const rootStyle: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'monospace', fontSize: 12, color: '#333', background: '#fff' };
const toolbarStyle: CSSProperties = { display: 'flex', gap: 4, padding: '4px 8px', borderBottom: '1px solid #ddd', background: '#f8f9fa', flexWrap: 'wrap', alignItems: 'center' };
const bodyStyle: CSSProperties = { flex: 1, display: 'flex', overflow: 'hidden' };
const listPaneStyle: CSSProperties = { width: '40%', minWidth: 200, maxWidth: 400, overflow: 'auto', borderRight: '1px solid #ddd' };
const detailPaneStyle: CSSProperties = { flex: 1, overflow: 'auto' };
const entityRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderBottom: '1px solid #e5e5e5' };
const entitySelectStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit' };
const detailToolbarStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 };
const controlBtnStyle: CSSProperties = { padding: '2px 8px', fontSize: 11, borderRadius: 3, border: '1px solid #ccc', background: '#f0f0f0', color: '#555', cursor: 'pointer' };
const copyBtnStyle: CSSProperties = { padding: '1px 7px', fontSize: 10, borderRadius: 3, border: '1px solid #ccc', background: '#f0f0f0', color: '#333', cursor: 'pointer', lineHeight: 1 };
const feedbackOkStyle: CSSProperties = { color: '#10b981', fontSize: 10 };
const feedbackErrorStyle: CSSProperties = { color: '#ef4444', fontSize: 10 };
const summaryStyle: CSSProperties = { color: '#888', fontSize: 10 };
const emptyStyle: CSSProperties = { color: '#999', textAlign: 'center', padding: 24, fontSize: 12 };
