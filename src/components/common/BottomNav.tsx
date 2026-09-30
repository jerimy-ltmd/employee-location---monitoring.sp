import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Home,
  MessageSquare,
  MapPin,
  User as UserIcon,
  Menu,
  X,
  Users,
  History,
  FileBarChart,
  Settings,
  Database,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const BottomNav: React.FC = () => {
  const { isAdmin, unreadMessagesCount } = useAuth();
  const [showAdminDrawer, setShowAdminDrawer] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-card/95 backdrop-blur-lg px-2 flex items-center justify-around safe-bottom">
        <NavLink
          to={isAdmin ? '/dashboard' : '/home'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors py-1',
              isActive ? 'text-amber-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-1">{isAdmin ? 'Dashboard' : 'Home'}</span>
        </NavLink>

        <NavLink
          to="/chats"
          className={({ isActive }) =>
            cn(
              'relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors py-1',
              isActive ? 'text-amber-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">Chats</span>
        </NavLink>

        <NavLink
          to={isAdmin ? '/map' : '/my-location'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors py-1',
              isActive ? 'text-amber-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <MapPin className="h-5 w-5" />
          <span className="text-[10px] mt-1">Location</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors py-1',
              isActive ? 'text-amber-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <UserIcon className="h-5 w-5" />
          <span className="text-[10px] mt-1">Profile</span>
        </NavLink>

        {isAdmin && (
          <button
            onClick={() => setShowAdminDrawer(true)}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-1">More</span>
          </button>
        )}
      </nav>

      {/* Admin Mobile Menu Drawer */}
      {showAdminDrawer && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
          <div
            className="flex-1"
            onClick={() => setShowAdminDrawer(false)}
          />
          <div className="rounded-t-2xl border-t border-border bg-card p-5 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-sm text-foreground">Management Console</h3>
              </div>
              <button
                onClick={() => setShowAdminDrawer(false)}
                className="p-1 rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setShowAdminDrawer(false);
                  navigate('/employees');
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <Users className="h-5 w-5 text-[#091D3C] dark:text-amber-400 mb-1" />
                <span className="text-xs font-semibold text-foreground">Employees</span>
                <span className="text-[10px] text-muted-foreground">Manage directory</span>
              </button>

              <button
                onClick={() => {
                  setShowAdminDrawer(false);
                  navigate('/map');
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <MapPin className="h-5 w-5 text-emerald-500 mb-1" />
                <span className="text-xs font-semibold text-foreground">Live Map</span>
                <span className="text-[10px] text-muted-foreground">Real-time status</span>
              </button>

              <button
                onClick={() => {
                  setShowAdminDrawer(false);
                  navigate('/history');
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <History className="h-5 w-5 text-blue-500 mb-1" />
                <span className="text-xs font-semibold text-foreground">Location Trail</span>
                <span className="text-[10px] text-muted-foreground">Movement logs</span>
              </button>

              <button
                onClick={() => {
                  setShowAdminDrawer(false);
                  navigate('/reports');
                }}
                className="flex flex-col items-start p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <FileBarChart className="h-5 w-5 text-purple-500 mb-1" />
                <span className="text-xs font-semibold text-foreground">Reports</span>
                <span className="text-[10px] text-muted-foreground">CSV &amp; Print</span>
              </button>

              <button
                onClick={() => {
                  setShowAdminDrawer(false);
                  navigate('/migrations');
                }}
                className="col-span-2 flex items-center justify-between p-3 rounded-xl border border-border bg-amber-500/10 hover:bg-amber-500/20 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="h-5 w-5 text-amber-500" />
                  <div>
                    <span className="text-xs font-semibold text-foreground">Database Migrations &amp; Integration</span>
                    <p className="text-[10px] text-muted-foreground">PostgreSQL, MariaDB/MySQL, SQL dumps</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAdminDrawer(false);
                  navigate('/settings');
                }}
                className="col-span-2 flex items-center justify-between p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-5 w-5 text-amber-500" />
                  <div>
                    <span className="text-xs font-semibold text-foreground">Geofence &amp; System Settings</span>
                    <p className="text-[10px] text-muted-foreground">Radius, threshold &amp; retention</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
