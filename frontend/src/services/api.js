import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    try {
      // Refresh token is in an HttpOnly cookie — just call the endpoint with credentials
      const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
      if (res.data?.data?.accessToken) {
        const { accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      }
    } catch {
      // Refresh failed — clear and redirect to login
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = '/auth';
  }
  return Promise.reject(error);
});

export const authAPI = {
  checkUser: (email) => api.get(`/auth/check-user?email=${encodeURIComponent(email)}`),
  sendOtp: (email) => api.post('/auth/send-otp', { email }),
  verifyOtp: (email, otp) => api.post('/auth/verify-otp', { email, otp }, { withCredentials: true }),
  register: (data) => api.post('/auth/register', data),
  refreshToken: () => api.post('/auth/refresh-token', {}, { withCredentials: true }),
  logout: () => api.post('/auth/logout', {}, { withCredentials: true }),
};

export const rideAPI = {
  requestRide: (data) => api.post('/rides/request', data),
  getCurrentRide: () => api.get('/rides/current'),
  cancelRide: (rideId, reason) => api.post(`/rides/${rideId}/cancel`, { reason }),
  rateRide: (rideId, rating, feedback) => api.post(`/rides/${rideId}/rate`, { rating, feedback }),
  getRiderHistory: () => api.get('/rides/my-rides'),
  getDriverHistory: () => api.get('/rides/driver-rides'),
  acceptRide: (rideId) => api.post(`/rides/${rideId}/accept`),
  startRide: (rideId, otp) => api.post(`/rides/${rideId}/start`, { otp }),
  completeRide: (rideId) => api.post(`/rides/${rideId}/complete`),
  getAvailableRides: (vehicleType) => api.get(`/rides/available${vehicleType ? `?vehicleType=${vehicleType}` : ''}`),
  getDriverCurrentRide: () => api.get('/rides/driver-current'),
  getAdminStats: () => api.get('/rides/admin/stats'),
};

export const driverAPI = {
  getProfile: () => api.get('/drivers/profile'),
  register: (data) => api.post('/drivers/register', data),
  updateStatus: (status) => api.patch(`/drivers/status?status=${status}`),
  updateLocation: (latitude, longitude) => api.patch('/drivers/location', { latitude, longitude }),
  getNearbyDrivers: (lat, lng, vehicleType) =>
    api.get('/drivers/nearby', { params: { lat, lng, vehicleType } }),
  getAllDrivers: () => api.get('/drivers/admin/all'),
  verifyDriver: (driverId) => api.patch(`/drivers/admin/${driverId}/verify`),
};

export const userAPI = {
  getMe: () => api.get('/users/me'),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getAllUsers: () => api.get('/users/admin/all'),
};

export const fareAPI = {
  estimate: (pickupLat, pickupLng, dropLat, dropLng) =>
    api.post('/fares/estimate', {
      pickupLatitude: pickupLat, pickupLongitude: pickupLng,
      dropLatitude: dropLat, dropLongitude: dropLng,
    }),
  getRules: () => api.get('/fares/rules'),
  updateRule: (id, data) => api.put(`/fares/rules/${id}`, data),
};

export const paymentAPI = {
  getRiderPayments: () => api.get('/payments/my-payments'),
  getDriverPayments: () => api.get('/payments/driver-payments'),
  getPaymentByRide: (rideId) => api.get(`/payments/ride/${rideId}`),
  getAdminStats: () => api.get('/payments/admin/stats'),
};

export default api;
