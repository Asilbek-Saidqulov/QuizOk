import api from './api'

export const rankingService = {
  // Get global rankings
  getGlobalRankings: async (params = {}) => {
    const response = await api.get('/api/rankings/global', { params })
    return response.data
  },

  // Get category rankings
  getCategoryRankings: async (category, params = {}) => {
    const response = await api.get(`/api/rankings/category/${category}`, { params })
    return response.data
  },

  // Get clan rankings
  getClanRankings: async (params = {}) => {
    const response = await api.get('/api/rankings/clans', { params })
    return response.data
  },

  // Get user's ranking
  getUserRanking: async (userId) => {
    const response = await api.get(`/api/rankings/user/${userId}`)
    return response.data
  },
}
