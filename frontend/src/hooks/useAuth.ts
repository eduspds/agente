import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'AGENT'
    tenant: { id: string; name: string; slug: string }
  }
}

export function useAuth() {
  const navigate = useNavigate()
  const { setTokens, setUser, logout: storeLogout } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await api.post<LoginResponse>('/auth/login', credentials)
      return data
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
      navigate('/dashboard')
    },
  })

  const logout = () => {
    storeLogout()
    navigate('/login')
  }

  return {
    login: loginMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    logout,
  }
}
