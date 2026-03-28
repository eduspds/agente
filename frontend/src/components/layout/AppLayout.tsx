import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useSocket } from '@/hooks/useSocket'

export default function AppLayout() {
  const { logout } = useAuth()
  useSocket()

  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar onLogout={logout} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
