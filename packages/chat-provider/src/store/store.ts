import { createContext } from 'react';
import { configureStore, createSelector } from '@reduxjs/toolkit';
import {
  createDispatchHook,
  createSelectorHook,
  createStoreHook,
  type ReactReduxContextValue,
} from 'react-redux';
import { timelineSlice } from './timelineSlice';
import { overlaySlice } from './overlaySlice';
import { runStatsSlice, toChatRunStats } from './runStatsSlice';

export function createChatStore() {
  return configureStore({
    reducer: {
      timeline: timelineSlice.reducer,
      overlay: overlaySlice.reducer,
      runStats: runStatsSlice.reducer,
    },
  });
}

export type ChatStore = ReturnType<typeof createChatStore>;
export type RootState = ReturnType<ChatStore['getState']>;
export type AppDispatch = ChatStore['dispatch'];

export const ChatReduxContext = createContext<ReactReduxContextValue | null>(null);

export const useChatDispatch = createDispatchHook(ChatReduxContext).withTypes<AppDispatch>();
export const useChatSelector = createSelectorHook(ChatReduxContext).withTypes<RootState>();
export const useChatStore = createStoreHook(ChatReduxContext).withTypes<ChatStore>();

export const selectTimelineEntities = createSelector(
  (s: RootState) => s.timeline.byId,
  (s: RootState) => s.timeline.order,
  (byId, order) => order.map((id) => byId[id]).filter(Boolean),
);

export const selectOverlay = (s: RootState) => s.overlay;

export const selectRunStats = (s: RootState) => toChatRunStats(s.runStats);

export const selectHasRunUsage = (s: RootState) => s.runStats.completedRuns > 0 || s.runStats.isStreaming;
