import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { paymentAPI } from '../../services/api'

export const getRiderPayments = createAsyncThunk('payment/getRiderPayments', async (_, { rejectWithValue }) => {
  try {
    const res = await paymentAPI.getRiderPayments()
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments')
  }
})

export const getDriverPayments = createAsyncThunk('payment/getDriverPayments', async (_, { rejectWithValue }) => {
  try {
    const res = await paymentAPI.getDriverPayments()
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments')
  }
})

export const getAdminPaymentStats = createAsyncThunk('payment/getAdminStats', async (_, { rejectWithValue }) => {
  try {
    const res = await paymentAPI.getAdminStats()
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch stats')
  }
})

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    payments: [],
    adminStats: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearPaymentError: (state) => { state.error = null }
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null }
    const rejected = (state, action) => { state.loading = false; state.error = action.payload }

    builder
      .addCase(getRiderPayments.pending, pending)
      .addCase(getRiderPayments.fulfilled, (state, action) => {
        state.loading = false
        state.payments = action.payload.data || []
      })
      .addCase(getRiderPayments.rejected, rejected)

      .addCase(getDriverPayments.pending, pending)
      .addCase(getDriverPayments.fulfilled, (state, action) => {
        state.loading = false
        state.payments = action.payload.data || []
      })
      .addCase(getDriverPayments.rejected, rejected)

      .addCase(getAdminPaymentStats.pending, pending)
      .addCase(getAdminPaymentStats.fulfilled, (state, action) => {
        state.loading = false
        state.adminStats = action.payload.data || null
      })
      .addCase(getAdminPaymentStats.rejected, rejected)
  }
})

export const { clearPaymentError } = paymentSlice.actions
export default paymentSlice.reducer
