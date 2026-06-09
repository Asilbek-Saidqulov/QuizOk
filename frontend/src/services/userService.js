import api from './api'

export const userService = {
  // User profile
  getProfile: async () => {
    const response = await api.get('/user/profile')
    return response.data
  },

  updateProfile: async (userData) => {
    const response = await api.put('/user/profile', userData)
    return response.data
  },

  // User statistics
  getStats: async () => {
    const response = await api.get('/user/stats')
    return response.data
  },

  // User activity
  getActivity: async () => {
    const response = await api.get('/user/activity')
    return response.data
  },

  // Daily quest
  getDailyQuest: async () => {
    const response = await api.get('/user/daily-quest')
    return response.data
  },

  // Rankings
  getRankings: async (category = 'general', limit = 50) => {
    const response = await api.get(`/rankings/${category}`, { params: { limit } })
    return response.data
  },

  // User ranking in category
  getUserRanking: async (category = 'general') => {
    const response = await api.get(`/rankings/me/${category}`)
    return response.data
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    const response = await api.patch('/user/password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
    return response.data
  },
}