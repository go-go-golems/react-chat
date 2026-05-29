import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { timelineSlice } from './timelineSlice';
import { overlaySlice } from './overlaySlice';

export const store = configureStore({
  reducer: {
    timeline: timelineSlice.reducer,
    overlay: overlaySlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// Selector helpers
export const selectTimelineEntities = (s: RootState) =>
  s.timeline.order.map((id) => s.timeline.byId[id]);

export const selectOverlay = (s: RootState) => s.overlay;
