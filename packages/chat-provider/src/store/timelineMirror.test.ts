import { describe, expect, it } from 'vitest';
import type { TimelineMutation } from '../ws/timelineAdapterRegistry';
import {
  applyTimelineMutationToMirror,
  createEmptyTimelineMirror,
  createTimelineMirror,
  selectTimelineEntitiesFromState,
} from './timelineMirror';
import { timelineSlice, type TimelineEntity, type TimelineState } from './timelineSlice';

function entity(id: string, props: Record<string, unknown>, kind = 'message'): TimelineEntity {
  return { id, kind, createdAt: 1, updatedAt: 1, props };
}

function applyReducerSequence(mutations: TimelineMutation[]): TimelineState {
  let state = timelineSlice.reducer(undefined, { type: '@@init' });
  for (const mutation of mutations) {
    if (mutation.deleteId) {
      state = timelineSlice.reducer(state, timelineSlice.actions.deleteEntity(mutation.deleteId));
    }
    if (mutation.upsert) {
      state = timelineSlice.reducer(state, timelineSlice.actions.upsertEntity(mutation.upsert));
    }
    if (mutation.upsertIfExists) {
      state = timelineSlice.reducer(state, timelineSlice.actions.upsertEntityIfExists(mutation.upsertIfExists));
    }
  }
  return state;
}

function applyMirrorSequence(mutations: TimelineMutation[]): TimelineState {
  let mirror = createEmptyTimelineMirror();
  for (const mutation of mutations) {
    mirror = applyTimelineMutationToMirror(mirror, mutation, { immutable: true });
  }
  return mirror;
}

describe('timeline mirror merge parity', () => {
  it('matches the Redux reducer for append and replace text patches', () => {
    const mutations: TimelineMutation[] = [
      { upsert: entity('m1', { role: 'assistant', contentPatch: 'hello' }) },
      { upsert: entity('m1', { contentPatch: ' world' }) },
      { upsert: entity('m1', { contentPatch: 'final', patchMode: 'REPLACE', status: 'finished' }) },
    ];

    const reducerState = applyReducerSequence(mutations);
    const mirrorState = applyMirrorSequence(mutations);

    expect(mirrorState).toEqual(reducerState);
    expect(mirrorState.byId.m1?.props.content).toBe('final');
    expect(mirrorState.byId.m1?.props.contentPatch).toBeUndefined();
    expect(mirrorState.byId.m1?.props.patchMode).toBeUndefined();
  });

  it('matches the Redux reducer for widget props patches with array append paths', () => {
    const mutations: TimelineMutation[] = [
      {
        upsert: entity(
          'w1',
          { instanceId: 'w1', widgetName: 'Example', props: { items: ['a'], title: 'old' } },
          'widget',
        ),
      },
      {
        upsert: entity(
          'w1',
          { propsPatch: { items: ['b'], title: 'new' }, patchPaths: ['items'], status: 'STREAMING' },
          'widget',
        ),
      },
    ];

    const reducerState = applyReducerSequence(mutations);
    const mirrorState = applyMirrorSequence(mutations);

    expect(mirrorState).toEqual(reducerState);
    expect(mirrorState.byId.w1?.props.props).toEqual({ items: ['a', 'b'], title: 'old' });
    expect(mirrorState.byId.w1?.props.status).toBe('STREAMING');
  });

  it('matches the Redux reducer for upsertIfExists and delete mutations', () => {
    const mutations: TimelineMutation[] = [
      { upsertIfExists: entity('missing', { contentPatch: 'ignored' }) },
      { upsert: entity('m1', { contentPatch: 'hello' }) },
      { upsertIfExists: entity('m1', { contentPatch: ' there' }) },
      { upsert: entity('m2', { content: 'second' }) },
      { deleteId: 'm1' },
    ];

    const reducerState = applyReducerSequence(mutations);
    const mirrorState = applyMirrorSequence(mutations);

    expect(mirrorState).toEqual(reducerState);
    expect(selectTimelineEntitiesFromState(mirrorState).map((next) => next.id)).toEqual(['m2']);
    expect(mirrorState.byId.m1).toBeUndefined();
    expect(mirrorState.byId.missing).toBeUndefined();
  });
});

describe('createTimelineMirror', () => {
  it('publishes immutable snapshots to subscribers', () => {
    const mirror = createTimelineMirror();
    const snapshots: TimelineState[] = [];
    const unsubscribe = mirror.subscribe(() => snapshots.push(mirror.getSnapshot()));

    const first = mirror.getSnapshot();
    mirror.apply({ upsert: entity('m1', { content: 'hello' }) });
    mirror.apply({ upsert: entity('m1', { contentPatch: ' world' }) });
    unsubscribe();
    mirror.apply({ upsert: entity('m2', { content: 'ignored by listener' }) });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).not.toBe(first);
    expect(snapshots[0]).not.toBe(snapshots[1]);
    expect(snapshots[1]?.byId.m1?.props.content).toBe('hello world');
    expect(mirror.getSnapshot().byId.m2).toBeDefined();
  });
});
