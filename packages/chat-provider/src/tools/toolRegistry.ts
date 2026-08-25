import type React from 'react';
import { z, type ZodType } from 'zod';

export type ToolExecutionMode = 'frontend' | 'human' | 'backend';

export type ToolExecutionContext = {
  signal: AbortSignal;
  toolCallId: string;
};

export type HumanToolRenderProps<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = {
  toolCallId: string;
  toolName: string;
  input: TInput;
  status: string;
  respond: (result: TResult) => void;
  reject: (error?: string) => void;
};

export type BaseTool<TInput = Record<string, unknown>> = {
  name: string;
  description?: string;
  mode?: ToolExecutionMode;
  /**
   * Legacy/direct JSON Schema manifest. Prefer `parameters` for new code so the
   * browser validates the same shape that it advertises to the backend.
   */
  inputSchema?: Record<string, unknown>;
  /** Zod schema used for browser-side validation and JSON Schema manifest export. */
  parameters?: ZodType<TInput>;
  available?: boolean | (() => boolean);
};

export type FrontendTool<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = BaseTool<TInput> & {
  mode?: 'frontend';
  execute: (input: TInput, context: ToolExecutionContext) => Promise<TResult> | TResult;
  resultSchema?: ZodType<TResult>;
};

export type HumanTool<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = BaseTool<TInput> & {
  mode: 'human';
  render: (props: HumanToolRenderProps<TInput, TResult>) => React.ReactNode;
  resultSchema?: ZodType<TResult>;
};

export type BackendToolUI<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = BaseTool<TInput> & {
  mode: 'backend';
  render?: (props: { input: TInput; result?: TResult; status: string }) => React.ReactNode;
  resultSchema?: ZodType<TResult>;
};

export type ToolDefinition = FrontendTool<any, any> | HumanTool<any, any> | BackendToolUI<any, any>;

export const PROVIDER_SAFE_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function assertProviderSafeToolName(name: string): void {
  if (!name.trim()) {
    throw new Error('frontend tool requires a name');
  }
  if (!PROVIDER_SAFE_TOOL_NAME_PATTERN.test(name)) {
    throw new Error(`frontend tool name "${name}" is not provider-safe; use only letters, numbers, underscores, and hyphens, for example "cart_add" instead of "cart.add"`);
  }
}

export type FrontendToolManifestEntry = {
  name: string;
  description?: string;
  mode: ToolExecutionMode;
  inputSchema: Record<string, unknown>;
  available: boolean;
};

export type ToolManifestSnapshot = {
  revision: number;
  digest: string;
  tools: ReadonlyArray<Readonly<FrontendToolManifestEntry>>;
};

export type ToolRegistrationOptions = {
  owner: string;
};

export type ToolReplacementOptions = {
  expectedOwner: string;
  owner: string;
};

export type ToolRegistry = {
  register: (tool: ToolDefinition, options?: ToolRegistrationOptions) => () => void;
  replace: (name: string, tool: ToolDefinition, options: ToolReplacementOptions) => () => void;
  get: (name: string) => ToolDefinition | undefined;
  owner: (name: string) => string | undefined;
  manifest: () => FrontendToolManifestEntry[];
  snapshot: () => ToolManifestSnapshot;
  revision: () => number;
};

type RegisteredTool = {
  tool: ToolDefinition;
  owner: string;
};

export class ChatToolRegistry implements ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private snapshotRevision = 0;
  private lastSnapshotDigest = '';
  private lastSnapshot: ToolManifestSnapshot | null = null;

  register(tool: ToolDefinition, options: ToolRegistrationOptions = { owner: 'anonymous' }): () => void {
    assertProviderSafeToolName(tool.name);
    const owner = requireOwner(options.owner);
    const existing = this.tools.get(tool.name);
    if (existing) {
      throw new Error(`frontend tool "${tool.name}" is already registered by owner "${existing.owner}"; owner "${owner}" must use replace with expectedOwner`);
    }
    return this.install(tool, owner);
  }

  replace(name: string, tool: ToolDefinition, options: ToolReplacementOptions): () => void {
    assertProviderSafeToolName(name);
    assertProviderSafeToolName(tool.name);
    if (tool.name !== name) throw new Error(`replacement tool name "${tool.name}" does not match registry key "${name}"`);
    const expectedOwner = requireOwner(options.expectedOwner);
    const owner = requireOwner(options.owner);
    const existing = this.tools.get(name);
    if (!existing) throw new Error(`cannot replace unregistered frontend tool "${name}"`);
    if (existing.owner !== expectedOwner) {
      throw new Error(`cannot replace frontend tool "${name}": expected owner "${expectedOwner}", current owner is "${existing.owner}"`);
    }
    return this.install(tool, owner);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.tool;
  }

  owner(name: string): string | undefined {
    return this.tools.get(name)?.owner;
  }

  manifest(): FrontendToolManifestEntry[] {
    return this.snapshot().tools.map((tool) => ({
      ...tool,
      inputSchema: cloneJSONRecord(tool.inputSchema),
    }));
  }

  snapshot(): ToolManifestSnapshot {
    const tools = Array.from(this.tools.values())
      .map(({ tool }) => ({
        name: tool.name,
        description: tool.description,
        mode: tool.mode ?? 'frontend',
        inputSchema: cloneJSONRecord(manifestSchemaForTool(tool)),
        available: typeof tool.available === 'function' ? tool.available() : tool.available !== false,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
    const digest = semanticManifestDigest(tools);
    if (this.lastSnapshot && digest === this.lastSnapshotDigest) return this.lastSnapshot;

    this.snapshotRevision++;
    this.lastSnapshotDigest = digest;
    this.lastSnapshot = deepFreeze({
      revision: this.snapshotRevision,
      digest,
      tools,
    });
    return this.lastSnapshot;
  }

  revision(): number {
    return this.snapshot().revision;
  }

  private install(tool: ToolDefinition, owner: string): () => void {
    const normalized = { ...tool, mode: tool.mode ?? 'frontend' } as ToolDefinition;
    const registration: RegisteredTool = { tool: normalized, owner };
    this.tools.set(tool.name, registration);
    this.invalidateSnapshot();
    return () => {
      if (this.tools.get(tool.name) === registration) {
        this.tools.delete(tool.name);
        this.invalidateSnapshot();
      }
    };
  }

  private invalidateSnapshot(): void {
    this.lastSnapshot = null;
  }
}

export function createToolRegistry(): ToolRegistry {
  return new ChatToolRegistry();
}

export function defineTool<T extends ToolDefinition>(tool: T): T {
  assertProviderSafeToolName(tool.name);
  return tool;
}

export function defineToolUI<TInput, TResult>(toolUI: BackendToolUI<TInput, TResult>): BackendToolUI<TInput, TResult> {
  assertProviderSafeToolName(toolUI.name);
  return toolUI;
}

export function parseToolInput<TInput>(tool: BaseTool<TInput>, value: unknown): TInput {
  if (tool.parameters) {
    return tool.parameters.parse(value);
  }
  return value as TInput;
}

export function parseToolResult<TResult>(tool: { resultSchema?: ZodType<TResult> }, value: unknown): TResult {
  if (tool.resultSchema) {
    return tool.resultSchema.parse(value);
  }
  return value as TResult;
}

export function formatToolValidationError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
        return `${path}: ${issue.message}`;
      })
      .join('; ');
  }
  return err instanceof Error ? err.message : String(err);
}

function manifestSchemaForTool(tool: ToolDefinition): Record<string, unknown> {
  if (tool.inputSchema) return tool.inputSchema;
  if (tool.parameters) {
    return z.toJSONSchema(tool.parameters) as Record<string, unknown>;
  }
  return { type: 'object' };
}

function requireOwner(owner: string): string {
  const normalized = owner.trim();
  if (!normalized) throw new Error('frontend tool registration owner must be non-empty');
  return normalized;
}

function semanticManifestDigest(tools: FrontendToolManifestEntry[]): string {
  const json = stableJSONStringify(tools);
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < json.length; index++) {
    hash ^= BigInt(json.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function stableJSONStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableJSONStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().filter((key) => record[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableJSONStringify(record[key])}`).join(',')}}`;
}

function cloneJSONRecord(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}
