import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useSocket } from '../../hooks/useSocket';

export function AppLayout() {
  useSocket();

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden bg-slate-950">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
