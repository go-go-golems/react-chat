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

export type ToolRegistry = {
  register: (tool: ToolDefinition) => () => void;
  get: (name: string) => ToolDefinition | undefined;
  manifest: () => FrontendToolManifestEntry[];
  revision: () => number;
};

export class ChatToolRegistry implements ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private manifestRevision = 0;

  register(tool: ToolDefinition): () => void {
    assertProviderSafeToolName(tool.name);
    const normalized = { ...tool, mode: tool.mode ?? 'frontend' } as ToolDefinition;
    this.tools.set(tool.name, normalized);
    this.manifestRevision++;
    return () => {
      const current = this.tools.get(tool.name);
      if (current === normalized) {
        this.tools.delete(tool.name);
        this.manifestRevision++;
      }
    };
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  manifest(): FrontendToolManifestEntry[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      mode: tool.mode ?? 'frontend',
      inputSchema: manifestSchemaForTool(tool),
      available: typeof tool.available === 'function' ? tool.available() : tool.available !== false,
    }));
  }

  revision(): number {
    return this.manifestRevision;
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
