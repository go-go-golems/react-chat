import type React from 'react';

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

export type BaseTool = {
  name: string;
  description?: string;
  mode?: ToolExecutionMode;
  inputSchema?: Record<string, unknown>;
  available?: boolean | (() => boolean);
};

export type FrontendTool<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = BaseTool & {
  mode?: 'frontend';
  execute: (input: TInput, context: ToolExecutionContext) => Promise<TResult> | TResult;
};

export type HumanTool<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = BaseTool & {
  mode: 'human';
  render: (props: HumanToolRenderProps<TInput, TResult>) => React.ReactNode;
};

export type BackendToolUI<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = BaseTool & {
  mode: 'backend';
  render?: (props: { input: TInput; result?: TResult; status: string }) => React.ReactNode;
};

export type ToolDefinition = FrontendTool<any, any> | HumanTool<any, any> | BackendToolUI<any, any>;

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

class DefaultToolRegistry implements ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private manifestRevision = 0;

  register(tool: ToolDefinition): () => void {
    if (!tool.name.trim()) {
      throw new Error('frontend tool requires a name');
    }
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
      inputSchema: tool.inputSchema ?? { type: 'object' },
      available: typeof tool.available === 'function' ? tool.available() : tool.available !== false,
    }));
  }

  revision(): number {
    return this.manifestRevision;
  }
}

export const defaultToolRegistry: ToolRegistry = new DefaultToolRegistry();

export function defineTool(tool: ToolDefinition): ToolDefinition {
  return tool;
}
