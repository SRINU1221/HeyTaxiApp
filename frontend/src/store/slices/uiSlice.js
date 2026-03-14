import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    modalOpen: null,
    notification: null,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen },
    openModal: (state, action) => { state.modalOpen = action.payload },
    closeModal: (state) => { state.modalOpen = null },
    showNotification: (state, action) => { state.notification = action.payload },
    clearNotification: (state) => { state.notification = null },
  }
})

export const { toggleSidebar, openModal, closeModal, showNotification, clearNotification } = uiSlice.actions
export default uiSlice.reducer
