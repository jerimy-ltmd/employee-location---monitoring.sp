import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Wifi,
  WifiOff,
  Building2,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout, isAdmin, unreadMessagesCount, pendingPings } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sm_theme', 'light');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalAlerts = (pendingPings?.length || 0) + (unreadMessagesCount || 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => navigate(isAdmin ? '/dashboard' : '/home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#091D3C] text-amber-400 shadow-sm border border-amber-500/30 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-foreground">
                  STAFF<span className="text-amber-500">MONITOR</span>
                </span>
                <span className="hidden md:inline-flex items-center rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  GOV SECURE
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block leading-none">
                Location &amp; Communication Portal
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time Connection State */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border"
            title={isConnected ? 'Real-time WebSocket connected' : 'WebSocket connecting / offline'}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span className="text-[11px] text-amber-600 dark:text-amber-400">Syncing</span>
              </>
            )}
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                  {totalAlerts > 9 ? '9+' : totalAlerts}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-xl z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {totalAlerts} unread
                  </span>
                </div>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {pendingPings && pendingPings.length > 0 ? (
                    pendingPings.map((ping) => (
                      <div
                        key={ping.id}
                        className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900 flex items-start gap-2"
                      >
                        <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0 animate-ping" />
                        <div>
                          <p className="font-semibold">Urgent Ping from Management</p>
                          <p className="text-[11px] opacity-90 mt-0.5">{ping.message}</p>
                        </div>
                      </div>
                    ))
                  ) : unreadMessagesCount > 0 ? (
                    <div
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/chats');
                      }}
                      className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900 cursor-pointer"
                    >
                      <p className="font-semibold">Unread Messages ({unreadMessagesCount})</p>
                      <p className="text-[11px] opacity-80 mt-0.5">Click to view conversations</p>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No unread alerts
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg border border-border p-1.5 sm:px-2.5 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="relative h-7 w-7 rounded-full bg-[#091D3C] text-amber-400 font-bold text-xs flex items-center justify-center overflow-hidden border border-amber-500/30">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-none text-foreground truncate max-w-[120px]">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                    {user.role}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-bold text-foreground">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="mt-1">
                      <span className="inline-block rounded-xs bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                        {user.department}
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors text-left cursor-pointer"
                    >
                      <UserIcon className="h-3.5 w-3.5" />
                      My Profile
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors text-left cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                        System Settings
                      </button>
                    )}
                  </div>
                  <div className="pt-1 border-t border-border">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
