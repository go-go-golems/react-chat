export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);

  if (value === null || value === undefined) return `${pad}null`;
  if (typeof value === 'boolean') return `${pad}${value}`;
  if (typeof value === 'number') return `${pad}${value}`;
  if (typeof value === 'bigint') return `${pad}${JSON.stringify(value.toString())}`;
  if (typeof value === 'string') {
    if (value.includes('\n')) {
      return `${pad}|\n${value.split('\n').map((line) => `${pad}  ${line}`).join('\n')}`;
    }
    return `${pad}${needsQuoting(value) ? JSON.stringify(value) : value}`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value.map((item) => {
      if (isScalar(item)) return `${pad}- ${toYaml(item, 0).trim()}`;
      return `${pad}- ${toYaml(item, indent + 2).trimStart()}`;
    }).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{}`;
    return entries.map(([key, val]) => {
      const renderedKey = needsQuoting(key) ? JSON.stringify(key) : key;
      if (isScalar(val)) return `${pad}${renderedKey}: ${toYaml(val, 0).trim()}`;
      return `${pad}${renderedKey}:\n${toYaml(val, indent + 1)}`;
    }).join('\n');
  }
  return `${pad}${JSON.stringify(String(value))}`;
}

function isScalar(value: unknown): boolean {
  return value === null || value === undefined || typeof value !== 'object';
}

function needsQuoting(value: string): boolean {
  if (value.length === 0) return true;
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === 'false' || lower === 'null' || lower === 'yes' || lower === 'no') return true;
  if (/^[\d.+-]/.test(value) && !Number.isNaN(Number(value))) return true;
  if (/[:{}\[\],&*?|>!%@`'"#]/.test(value)) return true;
  return false;
}
