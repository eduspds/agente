import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Smartphone,
  Settings,
  LogOut,
  Zap,
  MessageSquare,
  Brain,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../lib/utils';
import type { Role } from '../../types/models';

const NAV_ITEMS: {
  label: string;
  to: string;
  icon: React.ElementType;
  minRole?: Role;
}[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', to: '/leads', icon: MessageSquare },
  { label: 'Conexões', to: '/connections', icon: Smartphone, minRole: 'ADMIN' },
  { label: 'Config. IA', to: '/ai-config', icon: Brain, minRole: 'ADMIN' },
  { label: 'Usuários', to: '/users', icon: Users, minRole: 'ADMIN' },
  { label: 'Configurações', to: '/settings', icon: Settings, minRole: 'ADMIN' },
];

const ROLE_RANK: Record<Role, number> = { VIEWER: 0, AGENT: 1, ADMIN: 2 };

function hasAccess(userRole: Role, minRole?: Role): boolean {
  if (!minRole) return true;
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

export function Sidebar() {
  const { user } = useAuthStore();
  const { logout, isLoggingOut } = useAuth();

  if (!user) return null;

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col h-screen">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-slate-800">
        <div className="p-1.5 bg-blue-600 rounded-lg">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-base tracking-tight">
          LeadWatch
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter((item) => hasAccess(user.role, item.minRole)).map(
          (item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0',
                      isActive ? 'text-blue-400' : 'text-slate-500',
                    )}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ),
        )}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800/50 transition-all group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.name}</p>
            <p className="text-slate-500 text-xs truncate">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
