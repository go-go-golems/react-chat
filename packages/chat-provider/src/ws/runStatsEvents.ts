import type { AppDispatch } from '../store/store';
import { runStatsSlice, type ChatUsageTotals } from '../store/runStatsSlice';
import { asRecord, asString, type CanonicalFrame } from './protocol';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function usageFromPayload(payload: Record<string, unknown>): ChatUsageTotals | null {
  const usage = payload.usage;
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;
  const u = usage as Record<string, unknown>;
  return {
    inputTokens: toNumber(u.inputTokens),
    outputTokens: toNumber(u.outputTokens),
    cachedTokens: toNumber(u.cachedTokens),
    cacheCreationInputTokens: toNumber(u.cacheCreationInputTokens),
    cacheReadInputTokens: toNumber(u.cacheReadInputTokens),
  };
}

export function applyRunStatsEvent(frame: CanonicalFrame, dispatch: AppDispatch, nowMs = Date.now()): void {
  if (asString(frame.type) !== 'ui-event') return;
  const name = asString(frame.name);
  const payload = asRecord(frame.payload);

  switch (name) {
    case 'ChatRunStarted':
      dispatch(runStatsSlice.actions.runStarted(nowMs));
      return;
    case 'ChatTextPatch': {
      const text = asString(payload.text) || asString(payload.content);
      dispatch(runStatsSlice.actions.textPatchObserved({ chars: text.length }));
      return;
    }
    case 'ChatProviderCallMetadataUpdated':
      dispatch(runStatsSlice.actions.providerCallMetadataUpdated({ usage: usageFromPayload(payload) }));
      return;
    case 'ChatProviderCallFinished':
      dispatch(runStatsSlice.actions.providerCallFinished({
        usage: usageFromPayload(payload),
        durationMs: toNumber(payload.durationMs),
        stopReason: asString(payload.stopReason) || null,
      }));
      return;
    case 'ChatRunFinished':
    case 'ChatRunStopped':
    case 'ChatRunFailed':
      dispatch(runStatsSlice.actions.runFinished());
      return;
    default:
      return;
  }
}
