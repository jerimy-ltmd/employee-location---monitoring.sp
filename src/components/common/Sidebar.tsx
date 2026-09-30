import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  MapPin,
  History,
  MessageSquare,
  FileBarChart,
  Settings,
  Database,
  UserCheck,
  Compass,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { isAdmin, unreadMessagesCount } = useAuth();

  const adminNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Live Map', path: '/map', icon: MapPin },
    { name: 'Location History', path: '/history', icon: History },
    {
      name: 'Chats',
      path: '/chats',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
    { name: 'Database & Migrations', path: '/migrations', icon: Database },
    { name: 'Geofence & Settings', path: '/settings', icon: Settings },
  ];

  const employeeNav = [
    { name: 'Home Status', path: '/home', icon: LayoutDashboard },
    { name: 'My Location', path: '/my-location', icon: Compass },
    { name: 'Live Office Map', path: '/map', icon: MapPin },
    {
      name: 'Chats',
      path: '/chats',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { name: 'My History', path: '/my-history', icon: History },
    { name: 'Profile', path: '/profile', icon: UserCheck },
  ];

  const links = isAdmin ? adminNav : employeeNav;

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card shrink-0 select-none">
      <div className="flex flex-col flex-1 gap-1 p-4 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {isAdmin ? 'Administration Portal' : 'Employee Portal'}
        </div>

        <nav className="space-y-1">
          {links.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-[#091D3C] text-amber-400 font-semibold shadow-xs dark:bg-amber-400 dark:text-[#091D3C]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground">Policy Guard</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
            Location sharing strictly bound to browser permission guidelines.
          </p>
        </div>
      </div>
    </aside>
  );
};
