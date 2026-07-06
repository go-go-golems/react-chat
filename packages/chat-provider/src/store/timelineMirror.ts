import type { TimelineMutation } from '../ws/timelineAdapterRegistry';
import { applyTimelineMutationToTimelineState } from './timelineMerge';
import type { TimelineEntity, TimelineState } from './timelineTypes';

export type TimelineMirrorState = TimelineState;

export type TimelineMirrorController = {
  getSnapshot: () => TimelineMirrorState;
  setSnapshot: (state: TimelineMirrorState) => void;
  apply: (mutation: TimelineMutation) => void;
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
};

export function createEmptyTimelineMirror(): TimelineMirrorState {
  return { byId: {}, order: [] };
}

export function cloneTimelineState(state: TimelineMirrorState): TimelineMirrorState {
  return {
    byId: Object.fromEntries(Object.entries(state.byId).map(([id, entity]) => [id, { ...entity, props: { ...entity.props } }])),
    order: [...state.order],
  };
}

export function applyTimelineMutationToMirror(
  mirror: TimelineMirrorState,
  mutation: TimelineMutation,
  options: { immutable?: boolean } = {},
): TimelineMirrorState {
  const target = options.immutable ? cloneTimelineState(mirror) : mirror;
  applyTimelineMutationToTimelineState(target, mutation);
  return target;
}

export function selectTimelineEntitiesFromState(state: TimelineMirrorState): TimelineEntity[] {
  return state.order.map((id) => state.byId[id]).filter((entity): entity is TimelineEntity => Boolean(entity));
}

export function selectTimelineEntityByIdFromState(
  state: TimelineMirrorState,
  id: string,
): TimelineEntity | undefined {
  return state.byId[id];
}

export function createTimelineMirror(args: {
  initialState?: TimelineMirrorState;
  onChange?: (state: TimelineMirrorState, mutation: TimelineMutation | null) => void;
} = {}): TimelineMirrorController {
  let state = args.initialState ? cloneTimelineState(args.initialState) : createEmptyTimelineMirror();
  const listeners = new Set<() => void>();

  function emit(mutation: TimelineMutation | null): void {
    args.onChange?.(state, mutation);
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot() {
      return state;
    },
    setSnapshot(nextState) {
      state = cloneTimelineState(nextState);
      emit(null);
    },
    apply(mutation) {
      state = applyTimelineMutationToMirror(state, mutation, { immutable: true });
      emit(mutation);
    },
    clear() {
      state = createEmptyTimelineMirror();
      emit(null);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
