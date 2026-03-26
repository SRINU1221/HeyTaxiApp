import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// NEW: Check if user exists (decides login vs register flow)
export const checkUser = createAsyncThunk('auth/checkUser', async (email, { rejectWithValue }) => {
  try {
    const res = await api.get(`/auth/check-user?email=${encodeURIComponent(email)}`)
    return res.data
  } catch (err) {
    // 404 or error means user doesn't exist
    return rejectWithValue(err.response?.data?.message || 'User not found')
  }
})

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed')
  }
})

export const sendOtp = createAsyncThunk('auth/sendOtp', async (email, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/send-otp', { email })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send OTP')
  }
})

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/verify-otp', data)
    if (res.data.success) {
      const { accessToken, user } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('role', user?.role || '')
      localStorage.setItem('name', user?.name || '')
      localStorage.setItem('email', user?.email || '')
    }
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'OTP verification failed')
  }
})

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout')
  } catch {
    // Silent fail
  } finally {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    localStorage.removeItem('name')
    localStorage.removeItem('email')
  }
})

const loadUserFromStorage = () => {
  try {
    const user = localStorage.getItem('user')
    const token = localStorage.getItem('accessToken')
    if (user && token) {
      const parsed = JSON.parse(user)
      if (parsed?.role) localStorage.setItem('role', parsed.role)
      if (parsed?.name) localStorage.setItem('name', parsed.name)
      if (parsed?.email) localStorage.setItem('email', parsed.email)
      return { user: parsed, token }
    }
    return null
  } catch { return null }
}
const stored = loadUserFromStorage()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: stored?.user || null,
    token: stored?.token || null,
    isAuthenticated: !!stored,
    loading: false,
    error: null,
    otpSent: false,
    step: 'email', // 'email' | 'otp' | 'register'
    checkingUser: false,
  },
  reducers: {
    setStep: (state, action) => { state.step = action.payload },
    clearError: (state) => { state.error = null },
    clearOtpSent: (state) => { state.otpSent = false },
  },
  extraReducers: (builder) => {
    builder
      // Check User
      .addCase(checkUser.pending, (state) => { state.checkingUser = true; state.error = null })
      .addCase(checkUser.fulfilled, (state) => {
        // User exists → go to OTP step (sendOtp will be called separately)
        state.checkingUser = false
      })
      .addCase(checkUser.rejected, (state) => {
        // User not found → go to register
        state.checkingUser = false
        state.step = 'register'
      })
      // Register
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null })
      .addCase(registerUser.fulfilled, (state) => { state.loading = false; state.otpSent = true; state.step = 'otp' })
      .addCase(registerUser.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      // Send OTP
      .addCase(sendOtp.pending, (state) => { state.loading = true; state.error = null })
      .addCase(sendOtp.fulfilled, (state) => { state.loading = false; state.otpSent = true; state.step = 'otp' })
      .addCase(sendOtp.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      // Verify OTP
      .addCase(verifyOtp.pending, (state) => { state.loading = true; state.error = null })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.success) {
          state.user = action.payload.data.user
          state.token = action.payload.data.accessToken
          state.isAuthenticated = true
          state.step = 'email'
        } else {
          state.error = action.payload.message
        }
      })
      .addCase(verifyOtp.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null; state.token = null; state.isAuthenticated = false; state.step = 'email'
      })
  }
})

export const { setStep, clearError, clearOtpSent } = authSlice.actions
export default authSlice.reducer
