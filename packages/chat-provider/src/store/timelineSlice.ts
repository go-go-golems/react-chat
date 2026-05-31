import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TimelineEntity = {
  id: string;
  kind: string;
  createdAt: number;
  updatedAt?: number;
  version?: number;
  props: Record<string, unknown>;
};

type TimelineState = {
  byId: Record<string, TimelineEntity>;
  order: string[];
};

function applyStreamPatch(previous: string, patch: string, mode: unknown): string {
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
  const props = (existing as any).props || {};
  const patchProps = (patch as any).propsPatch || patch;

  if (patchPaths.length > 0) {
    for (const path of patchPaths) {
      if (path in patchProps) {
        // For array paths, append
        if (Array.isArray(props[path]) && Array.isArray(patchProps[path])) {
          (merged as any).props = {
            ...props,
            [path]: [...(props[path] as any[]), ...(patchProps[path] as any[])],
          };
        } else {
          (merged as any).props = { ...props, [path]: patchProps[path] };
        }
      }
    }
  } else {
    // Full merge of all patch fields into props
    (merged as any).props = { ...props, ...patchProps };
  }
  return merged;
}

function mergePropsWithPatches(
  existingProps: Record<string, unknown>,
  incomingProps: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...(existingProps ?? {}), ...(incomingProps ?? {}) };
  const contentPatch = merged.contentPatch as string | undefined;
  const patchMode = merged.patchMode;
  delete merged.contentPatch;
  delete merged.patchMode;

  if (contentPatch !== undefined) {
    const previous = typeof existingProps?.content === 'string' ? existingProps.content as string : '';
    merged.content = applyStreamPatch(previous, contentPatch, patchMode);
  }

  // Handle widget props patches
  const propsPatch = merged.propsPatch;
  const patchPaths = (merged.patchPaths as string[]) || [];
  delete merged.propsPatch;
  delete merged.patchPaths;

  if (propsPatch && typeof propsPatch === 'object') {
    return mergeWidgetProps(merged, propsPatch as Record<string, unknown>, patchPaths);
  }

  return merged;
}

function mergeTimelineEntity(state: TimelineState, e: TimelineEntity, createIfMissing: boolean) {
  const existing = state.byId[e.id];
  const incomingProps = { ...(e.props ?? {}) };

  if (!existing) {
    if (!createIfMissing) return;
    state.byId[e.id] = { ...e, props: mergePropsWithPatches({}, incomingProps) };
    state.order.push(e.id);
    return;
  }

  state.byId[e.id] = {
    ...existing,
    ...e,
    createdAt: existing.createdAt,
    kind: e.kind || existing.kind,
    props: mergePropsWithPatches(existing.props, incomingProps),
  };
}

export const timelineSlice = createSlice({
  name: 'timeline',
  initialState: { byId: {}, order: [] } as TimelineState,
  reducers: {
    upsertEntity(state, action: PayloadAction<TimelineEntity>) {
      mergeTimelineEntity(state, action.payload, true);
    },
    upsertEntityIfExists(state, action: PayloadAction<TimelineEntity>) {
      mergeTimelineEntity(state, action.payload, false);
    },
    deleteEntity(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.byId[id];
      state.order = state.order.filter((entry) => entry !== id);
    },
    clear(state) {
      state.byId = {};
      state.order = [];
    },
  },
});
