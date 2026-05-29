export type ToolExecutionMode = 'frontend' | 'human' | 'backend';

export type ToolExecutionContext = {
  signal: AbortSignal;
  toolCallId: string;
};

export type FrontendTool<TInput = Record<string, unknown>, TResult = Record<string, unknown>> = {
  name: string;
  description?: string;
  mode?: ToolExecutionMode;
  inputSchema?: Record<string, unknown>;
  available?: boolean | (() => boolean);
  execute: (input: TInput, context: ToolExecutionContext) => Promise<TResult> | TResult;
};

export type FrontendToolManifestEntry = {
  name: string;
  description?: string;
  mode: ToolExecutionMode;
  inputSchema: Record<string, unknown>;
  available: boolean;
};

export type ToolRegistry = {
  register: <TInput, TResult>(tool: FrontendTool<TInput, TResult>) => () => void;
  get: (name: string) => FrontendTool | undefined;
  manifest: () => FrontendToolManifestEntry[];
  revision: () => number;
};

class DefaultToolRegistry implements ToolRegistry {
  private tools = new Map<string, FrontendTool>();
  private manifestRevision = 0;

  register<TInput, TResult>(tool: FrontendTool<TInput, TResult>): () => void {
    if (!tool.name.trim()) {
      throw new Error('frontend tool requires a name');
    }
    const normalized = { ...tool, mode: tool.mode ?? 'frontend' } as FrontendTool;
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

  get(name: string): FrontendTool | undefined {
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

export function defineTool<TInput, TResult>(tool: FrontendTool<TInput, TResult>): FrontendTool<TInput, TResult> {
  return tool;
}
