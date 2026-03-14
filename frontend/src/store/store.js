import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import rideSlice from './slices/rideSlice'
import driverSlice from './slices/driverSlice'
import uiSlice from './slices/uiSlice'
import paymentSlice from './slices/paymentSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ride: rideSlice,
    driver: driverSlice,
    ui: uiSlice,
    payment: paymentSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/loginSuccess'],
      },
    }),
})

export default store
