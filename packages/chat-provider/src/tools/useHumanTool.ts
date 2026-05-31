import type { HumanTool } from './toolRegistry';
import { useTool } from './useTool';

export function useHumanTool<TInput, TResult>(tool: HumanTool<TInput, TResult>, deps: unknown[] = []) {
  useTool(tool, deps);
}
