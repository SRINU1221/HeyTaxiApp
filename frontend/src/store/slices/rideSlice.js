import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const requestRide = createAsyncThunk('ride/request', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/rides/request', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to request ride')
  }
})

export const getCurrentRide = createAsyncThunk('ride/current', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/rides/current')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'No active ride')
  }
})

export const getRideHistory = createAsyncThunk('ride/history', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/rides/my-rides')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load history')
  }
})

export const cancelRide = createAsyncThunk('ride/cancel', async ({ rideId, reason }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/rides/${rideId}/cancel`, { reason })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to cancel')
  }
})

export const rateRide = createAsyncThunk('ride/rate', async ({ rideId, rating, feedback }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/rides/${rideId}/rate`, { rating, feedback })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to rate')
  }
})

const rideSlice = createSlice({
  name: 'ride',
  initialState: {
    currentRide: null,
    history: [],
    loading: false,
    error: null,
    selectedVehicle: null,
  },
  reducers: {
    clearCurrentRide: (state) => { state.currentRide = null },
    clearError: (state) => { state.error = null },
    setCurrentRide: (state, action) => { state.currentRide = action.payload },
    setSelectedVehicle: (state, action) => { state.selectedVehicle = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestRide.pending, (state) => { state.loading = true; state.error = null })
      .addCase(requestRide.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.success) state.currentRide = action.payload.data
      })
      .addCase(requestRide.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(getCurrentRide.fulfilled, (state, action) => {
        if (action.payload.success) state.currentRide = action.payload.data
        else state.currentRide = null
      })

      .addCase(getRideHistory.fulfilled, (state, action) => {
        if (action.payload.success) state.history = action.payload.data
      })

      .addCase(cancelRide.fulfilled, (state, action) => {
        if (action.payload.success) state.currentRide = null
      })
  }
})

export const { clearCurrentRide, clearError, setCurrentRide, setSelectedVehicle } = rideSlice.actions
export default rideSlice.reducer


