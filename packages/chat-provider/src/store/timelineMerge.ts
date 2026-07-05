import type { TimelineMutation } from '../ws/timelineAdapterRegistry';
import type { TimelineEntity, TimelineState } from './timelineTypes';

export function applyStreamPatch(previous: string, patch: string, mode: unknown): string {
  if (
    mode === 'CHAT_STREAM_PATCH_MODE_SNAPSHOT' ||
    mode === 'CHAT_STREAM_PATCH_MODE_REPLACE' ||
    mode === 'SNAPSHOT' ||
    mode === 'REPLACE'
  ) {
    return patch;
  }
  return `${previous}${patch}`;
}

function mergeWidgetProps(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
  patchPaths: string[],
): Record<string, unknown> {
  const merged = { ...existing };
  const props = (existing as { props?: unknown }).props && typeof (existing as { props?: unknown }).props === 'object'
    ? ((existing as { props: Record<string, unknown> }).props)
    : {};
  const patchProps = (patch as { propsPatch?: unknown }).propsPatch && typeof (patch as { propsPatch?: unknown }).propsPatch === 'object'
    ? ((patch as { propsPatch: Record<string, unknown> }).propsPatch)
    : patch;

  if (patchPaths.length > 0) {
    for (const path of patchPaths) {
      if (path in patchProps) {
        if (Array.isArray(props[path]) && Array.isArray(patchProps[path])) {
          (merged as { props?: Record<string, unknown> }).props = {
            ...props,
            [path]: [...(props[path] as unknown[]), ...(patchProps[path] as unknown[])],
          };
        } else {
          (merged as { props?: Record<string, unknown> }).props = { ...props, [path]: patchProps[path] };
        }
      }
    }
  } else {
    (merged as { props?: Record<string, unknown> }).props = { ...props, ...patchProps };
  }
  return merged;
}

export function mergePropsWithPatches(
  existingProps: Record<string, unknown>,
  incomingProps: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...(existingProps ?? {}), ...(incomingProps ?? {}) };
  const contentPatch = merged.contentPatch as string | undefined;
  const patchMode = merged.patchMode;
  delete merged.contentPatch;
  delete merged.patchMode;

  if (contentPatch !== undefined) {
    const previous = typeof existingProps?.content === 'string' ? existingProps.content : '';
    merged.content = applyStreamPatch(previous, contentPatch, patchMode);
  }

  const propsPatch = merged.propsPatch;
  const patchPaths = Array.isArray(merged.patchPaths) ? (merged.patchPaths as string[]) : [];
  delete merged.propsPatch;
  delete merged.patchPaths;

  if (propsPatch && typeof propsPatch === 'object') {
    return mergeWidgetProps(merged, propsPatch as Record<string, unknown>, patchPaths);
  }

  return merged;
}

export function mergeTimelineEntityIntoState(
  state: TimelineState,
  entity: TimelineEntity,
  createIfMissing: boolean,
): void {
  const existing = state.byId[entity.id];
  const incomingProps = { ...(entity.props ?? {}) };

  if (!existing) {
    if (!createIfMissing) return;
    state.byId[entity.id] = { ...entity, props: mergePropsWithPatches({}, incomingProps) };
    state.order.push(entity.id);
    return;
  }

  state.byId[entity.id] = {
    ...existing,
    ...entity,
    createdAt: existing.createdAt,
    kind: entity.kind || existing.kind,
    props: mergePropsWithPatches(existing.props, incomingProps),
  };
}

export function applyTimelineMutationToTimelineState(state: TimelineState, mutation: TimelineMutation): void {
  if (mutation.deleteId) {
    const id = mutation.deleteId;
    delete state.byId[id];
    state.order = state.order.filter((entry) => entry !== id);
  }
  if (mutation.upsert) {
    mergeTimelineEntityIntoState(state, mutation.upsert, true);
  }
  if (mutation.upsertIfExists) {
    mergeTimelineEntityIntoState(state, mutation.upsertIfExists, false);
  }
}
