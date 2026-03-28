import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth.store'

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const { token, tenantId } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableRequest | undefined
    if (!original) return Promise.reject(error)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState()
        if (!refreshToken) {
          logout()
          window.location.href = '/login'
          return Promise.reject(error)
        }
        const { data } = await axios.post<{ accessToken: string }>('/api/v1/auth/refresh', {
          refreshToken,
        })
        setTokens(data.accessToken, refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
