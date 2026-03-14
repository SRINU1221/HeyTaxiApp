import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const getDriverProfile = createAsyncThunk('driver/profile', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/drivers/profile')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load profile')
  }
})

export const updateDriverStatus = createAsyncThunk('driver/status', async (status, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/drivers/status?status=${status}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update status')
  }
})

export const getDriverRides = createAsyncThunk('driver/rides', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/rides/driver-rides')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const acceptRide = createAsyncThunk('driver/acceptRide', async (rideId, { rejectWithValue }) => {
  try {
    const res = await api.post(`/rides/${rideId}/accept`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const startRide = createAsyncThunk('driver/startRide', async (rideId, { rejectWithValue }) => {
  try {
    const res = await api.post(`/rides/${rideId}/start`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const completeRide = createAsyncThunk('driver/completeRide', async (rideId, { rejectWithValue }) => {
  try {
    const res = await api.post(`/rides/${rideId}/complete`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const driverSlice = createSlice({
  name: 'driver',
  initialState: {
    profile: null,
    rideHistory: [],
    currentRide: null,
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentRide: (state, action) => { state.currentRide = action.payload },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDriverProfile.fulfilled, (state, action) => {
        if (action.payload.success) state.profile = action.payload.data
      })
      .addCase(updateDriverStatus.fulfilled, (state, action) => {
        if (action.payload.success) state.profile = action.payload.data
      })
      .addCase(getDriverRides.fulfilled, (state, action) => {
        if (action.payload.success) state.rideHistory = action.payload.data
      })
      .addCase(acceptRide.fulfilled, (state, action) => {
        if (action.payload.success) state.currentRide = action.payload.data
      })
      .addCase(completeRide.fulfilled, (state, action) => {
        if (action.payload.success) { state.currentRide = null }
      })
  }
})

export const { setCurrentRide, clearError } = driverSlice.actions
export default driverSlice.reducer
