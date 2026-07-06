import { useMemo, useState, type CSSProperties } from 'react';

export interface SyntaxHighlightProps {
  code: string;
  language: 'javascript' | 'json' | 'yaml' | string;
  maxLines?: number;
  variant?: 'light' | 'dark';
  style?: CSSProperties;
}

export function SyntaxHighlight({ code, language, maxLines = 0, variant = 'light', style }: SyntaxHighlightProps) {
  const [expanded, setExpanded] = useState(false);
  const lines = useMemo(() => code.split('\n'), [code]);
  const shouldTruncate = maxLines > 0 && !expanded && lines.length > maxLines;
  const displayCode = shouldTruncate ? `${lines.slice(0, maxLines).join('\n')}\n…` : code;

  return (
    <div data-part="syntax-highlight" data-variant={variant} data-language={language}>
      <pre style={{ ...preStyle(variant, expanded, maxLines), ...style }}>{displayCode}</pre>
      {maxLines > 0 && lines.length > maxLines && (
        <button type="button" onClick={() => setExpanded((current) => !current)} style={toggleStyle}>
          {expanded ? '▲ collapse' : `▼ show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

function preStyle(variant: 'light' | 'dark', expanded: boolean, maxLines: number): CSSProperties {
  return {
    margin: '4px 0',
    padding: '6px 8px',
    background: variant === 'dark' ? '#0d0d1a' : '#f6f8fa',
    color: variant === 'dark' ? '#c8d6e5' : '#24292f',
    borderRadius: 4,
    fontSize: 11,
    lineHeight: 1.5,
    overflow: 'auto',
    maxHeight: expanded ? 600 : maxLines > 0 ? undefined : 240,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
}

const toggleStyle: CSSProperties = {
  fontSize: 11,
  background: 'none',
  border: 'none',
  color: '#1a6dcc',
  cursor: 'pointer',
  padding: 0,
};
