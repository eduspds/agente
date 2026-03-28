import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'AGENT'
  tenant: { id: string; name: string; slug: string }
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  tenantId: string | null
  user: User | null
  setTokens: (token: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      tenantId: null,
      user: null,
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setUser: (user) => set({ user, tenantId: user.tenant.id }),
      logout: () => set({ token: null, refreshToken: null, user: null, tenantId: null }),
    }),
    { name: 'leadwatch-auth' },
  ),
)
