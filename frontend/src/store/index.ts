import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';
import timetableSlice from './timetableSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    timetable: timetableSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
