import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { mergeTimelineEntityIntoState } from './timelineMerge';
import type { TimelineEntity, TimelineState } from './timelineTypes';

export type { TimelineEntity, TimelineState } from './timelineTypes';

export const timelineSlice = createSlice({
  name: 'timeline',
  initialState: { byId: {}, order: [] } as TimelineState,
  reducers: {
    upsertEntity(state, action: PayloadAction<TimelineEntity>) {
      mergeTimelineEntityIntoState(state, action.payload, true);
    },
    upsertEntityIfExists(state, action: PayloadAction<TimelineEntity>) {
      mergeTimelineEntityIntoState(state, action.payload, false);
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
