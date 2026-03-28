import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Smartphone,
  Settings,
  Kanban,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
    isActive ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800'
  }`

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const role = useAuthStore((s) => s.user?.role)

  const adminNav = (
    <>
      <NavLink to="/whatsapp" className={linkClass}>
        <Smartphone className="w-5 h-5 shrink-0" />
        WhatsApp
      </NavLink>
      <NavLink to="/users" className={linkClass}>
        <Users className="w-5 h-5 shrink-0" />
        Usuários
      </NavLink>
      <NavLink to="/settings" className={linkClass}>
        <Settings className="w-5 h-5 shrink-0" />
        Configurações
      </NavLink>
    </>
  )

  return (
    <aside className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white">LeadWatch</h1>
        <p className="text-xs text-slate-500 mt-1">Inteligência de vendas</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          Dashboard
        </NavLink>
        <NavLink to="/leads" className={linkClass}>
          <Kanban className="w-5 h-5 shrink-0" />
          Leads
        </NavLink>
        <NavLink to="/conversations" className={linkClass}>
          <MessageCircle className="w-5 h-5 shrink-0" />
          Conversas
        </NavLink>
        {role === 'ADMIN' ? adminNav : null}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
