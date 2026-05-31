import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { timelineSlice } from './timelineSlice';
import { overlaySlice } from './overlaySlice';

export function createChatStore() {
  return configureStore({
    reducer: {
      timeline: timelineSlice.reducer,
      overlay: overlaySlice.reducer,
    },
  });
}

export type ChatStore = ReturnType<typeof createChatStore>;
export type RootState = ReturnType<ChatStore['getState']>;
export type AppDispatch = ChatStore['dispatch'];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const selectTimelineEntities = (s: RootState) =>
  s.timeline.order.map((id) => s.timeline.byId[id]);

export const selectOverlay = (s: RootState) => s.overlay;
