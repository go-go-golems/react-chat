import { useCallback, useState, type ReactNode, type CSSProperties } from 'react';

const DEFAULT_MAX_DEPTH = 20;
const STRING_TRUNCATE_THRESHOLD = 200;

export interface StructuredDataTreeProps {
  data: unknown;
  label?: string;
  defaultCollapsed?: boolean;
  maxDepth?: number;
}

export function StructuredDataTree({
  data,
  label,
  defaultCollapsed = true,
  maxDepth = DEFAULT_MAX_DEPTH,
}: StructuredDataTreeProps) {
  return (
    <div data-part="structured-tree" style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
      <TreeNode value={data} path={label ?? 'root'} depth={0} maxDepth={maxDepth} defaultCollapsed={defaultCollapsed} />
    </div>
  );
}

interface TreeNodeProps {
  value: unknown;
  path: string;
  depth: number;
  maxDepth: number;
  defaultCollapsed: boolean;
}

function TreeNode({ value, path, depth, maxDepth, defaultCollapsed }: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed && depth > 0);
  const toggle = useCallback(() => setCollapsed((current) => !current), []);

  if (depth > maxDepth) return <span style={scalarStyle}>[max depth]</span>;
  if (value === null) return <ScalarLine label={path} value="null" color="#cf222e" />;
  if (value === undefined) return <ScalarLine label={path} value="undefined" color="#cf222e" />;
  if (typeof value === 'string') return <StringLine label={path} rawValue={value} />;
  if (typeof value === 'number') return <ScalarLine label={path} value={String(value)} color="#0969da" />;
  if (typeof value === 'boolean') return <ScalarLine label={path} value={String(value)} color="#cf222e" />;
  if (typeof value !== 'object') return <ScalarLine label={path} value={String(value)} color="#7c3aed" />;

  if (Array.isArray(value)) {
    if (value.length === 0) return <ScalarLine label={path} value="[]" color="#6b7280" />;
    return (
      <CollapsibleNode label={path} summary={`Array(${value.length})`} collapsed={collapsed} onToggle={toggle} depth={depth}>
        {value.map((item, index) => (
          <TreeNode key={index} value={item} path={`[${index}]`} depth={depth + 1} maxDepth={maxDepth} defaultCollapsed={defaultCollapsed} />
        ))}
      </CollapsibleNode>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return <ScalarLine label={path} value="{}" color="#6b7280" />;
  return (
    <CollapsibleNode label={path} summary={`{${entries.length} keys}`} collapsed={collapsed} onToggle={toggle} depth={depth}>
      {entries.map(([key, val]) => (
        <TreeNode key={key} value={val} path={key} depth={depth + 1} maxDepth={maxDepth} defaultCollapsed={defaultCollapsed} />
      ))}
    </CollapsibleNode>
  );
}

function ScalarLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ paddingLeft: 4 }}>
      <span style={keyStyle}>{label}: </span>
      <span style={{ ...scalarStyle, color }}>{value}</span>
    </div>
  );
}

function StringLine({ label, rawValue }: { label: string; rawValue: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = rawValue.length > STRING_TRUNCATE_THRESHOLD;
  const display = isLong && !expanded ? `"${rawValue.slice(0, STRING_TRUNCATE_THRESHOLD)}…"` : `"${rawValue}"`;
  return (
    <div style={{ paddingLeft: 4 }}>
      <span style={keyStyle}>{label}: </span>
      <span style={{ ...scalarStyle, color: '#0550ae' }}>{display}</span>
      {isLong && (
        <button type="button" onClick={() => setExpanded((current) => !current)} style={expandBtnStyle}>
          {expanded ? '▲ less' : `▼ ${rawValue.length} chars`}
        </button>
      )}
    </div>
  );
}

function CollapsibleNode({
  label,
  summary,
  collapsed,
  onToggle,
  depth,
  children,
}: {
  label: string;
  summary: string;
  collapsed: boolean;
  onToggle: () => void;
  depth: number;
  children: ReactNode;
}) {
  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      <button type="button" onClick={onToggle} style={treeButtonStyle}>
        <span style={{ color: '#999', fontSize: 10, marginRight: 4 }}>{collapsed ? '▶' : '▼'}</span>
        <span style={keyStyle}>{label}</span>
        {collapsed && <span style={{ color: '#888', marginLeft: 6, fontSize: 10 }}>{summary}</span>}
      </button>
      {!collapsed && <div style={{ paddingLeft: 8, borderLeft: '1px solid #ddd' }}>{children}</div>}
    </div>
  );
}

const keyStyle: CSSProperties = { color: '#7c3aed', fontWeight: 600 };
const scalarStyle: CSSProperties = { wordBreak: 'break-all' };
const treeButtonStyle: CSSProperties = {
  cursor: 'pointer',
  padding: '1px 4px',
  borderRadius: 2,
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  userSelect: 'none',
  font: 'inherit',
  color: 'inherit',
};
const expandBtnStyle: CSSProperties = {
  marginLeft: 6,
  padding: '0 4px',
  fontSize: 9,
  border: 'none',
  background: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  verticalAlign: 'baseline',
};
