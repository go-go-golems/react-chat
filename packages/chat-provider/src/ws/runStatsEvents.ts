import type { ChatProviderCallInfo, ChatUsageTotals } from '../store/runStatsSlice';
import { runStatsSlice } from '../store/runStatsSlice';
import type { AppDispatch } from '../store/store';
import { asRecord, asString, type CanonicalFrame } from './protocol';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
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

export function providerCallInfoFromPayload(payload: Record<string, unknown>): ChatProviderCallInfo {
  const meta = asRecord(payload.meta);
  const metadata = asRecord(payload.metadata);
  const extra = asRecord(meta.extra ?? metadata.extra ?? payload.extra);
  const correlation = asRecord(payload.correlation ?? payload.corr);
  const providerCallId = firstString(correlation.provider_call_id, correlation.providerCallId, payload.providerCallId);

  return {
    usage: usageFromPayload(payload),
    model: firstString(
      payload.model,
      payload.modelName,
      payload.model_name,
      meta.model,
      metadata.model,
      extra.model,
      extra.modelName,
      extra.model_name,
    ),
    provider: firstString(
      payload.provider,
      payload.providerName,
      payload.provider_name,
      meta.provider,
      metadata.provider,
      extra.provider,
      extra.providerName,
      extra.provider_name,
      // Provider-call IDs often start with the provider slug, e.g.
      // `openai_responses:inference-1:provider-call:0`.
      providerCallId?.includes(':') ? providerCallId.split(':')[0] : null,
    ),
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
      dispatch(runStatsSlice.actions.textPatchObserved({ chars: text.length, mode: payload.mode }));
      return;
    }
    case 'ChatProviderCallStarted': {
      const { model, provider } = providerCallInfoFromPayload(payload);
      dispatch(runStatsSlice.actions.providerCallStarted({ model, provider }));
      return;
    }
    case 'ChatProviderCallMetadataUpdated':
      dispatch(runStatsSlice.actions.providerCallMetadataUpdated(providerCallInfoFromPayload(payload)));
      return;
    case 'ChatProviderCallFinished':
      dispatch(runStatsSlice.actions.providerCallFinished({
        ...providerCallInfoFromPayload(payload),
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
