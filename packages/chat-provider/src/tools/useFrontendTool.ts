import type { FrontendTool } from './toolRegistry';
import { useTool } from './useTool';

export function useFrontendTool<TInput, TResult>(tool: FrontendTool<TInput, TResult>, deps: unknown[] = []) {
  useTool(tool, deps);
}
