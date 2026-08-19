import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TransportStatus } from '../ws/sessionStreamTransport';

type OverlayState = {
  sessionId: string;
  runStatus: string;
  wsStatus: TransportStatus;
  isOpen: boolean;
  error: string | null;
};

const initialState: OverlayState = {
  sessionId: '',
  runStatus: 'idle',
  wsStatus: 'idle',
  isOpen: false,
  error: null,
};

export const overlaySlice = createSlice({
  name: 'overlay',
  initialState,
  reducers: {
    setSessionId(state, action: PayloadAction<string>) {
      state.sessionId = action.payload;
    },
    setRunStatus(state, action: PayloadAction<string>) {
      state.runStatus = action.payload;
    },
    setWsStatus(state, action: PayloadAction<TransportStatus>) {
      state.wsStatus = action.payload;
    },
    setOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
    },
    toggleOpen(state) {
      state.isOpen = !state.isOpen;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    reset(_state) {
      return { ...initialState };
    },
  },
});
