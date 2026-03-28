import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/Dashboard'
import LeadsPage from '@/pages/Leads'
import ConversationsPage from '@/pages/Conversations'
import ConversationDetailPage from '@/pages/ConversationDetail'
import WhatsappPage from '@/pages/Whatsapp'
import UsersPage from '@/pages/Users'
import SettingsPage from '@/pages/Settings'
import AppLayout from '@/components/layout/AppLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
})

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="conversations/:leadId" element={<ConversationDetailPage />} />
            <Route path="whatsapp" element={<WhatsappPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
