import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatPhilippineTime } from '../../lib/utils';
import {
  Compass,
  MapPin,
  MessageSquare,
  BellRing,
  ShieldCheck,
  ChevronRight,
  Radio,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const EmployeeHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    isSharing,
    startTracking,
    stopTracking,
    status,
    lastSentTime,
    setSimulatedPosition,
  } = useLocationTracker();

  const [recentConvos, setRecentConvos] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/conversations', {
      headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentConvos(data.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-4 pb-16 max-w-lg mx-auto">
      {/* Welcome Card */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-xs text-muted-foreground">{user?.position} &bull; {user?.department}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-[#091D3C] text-amber-400 font-bold text-sm flex items-center justify-center border border-amber-500/30">
          {user?.name.charAt(0)}
        </div>
      </div>

      {/* Main Perimeter Status Card (Section 19) */}
      <Card
        className={`border-2 transition-all ${
          status === 'INSIDE'
            ? 'border-emerald-500/80 bg-emerald-500/5'
            : status === 'OUTSIDE'
            ? 'border-rose-500/80 bg-rose-500/5'
            : 'border-border'
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workplace Perimeter
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {lastSentTime ? formatPhilippineTime(lastSentTime.toISOString()) : 'Pending Sync'}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                status === 'INSIDE'
                  ? 'bg-emerald-600'
                  : status === 'OUTSIDE'
                  ? 'bg-rose-600'
                  : 'bg-slate-500'
              }`}
            >
              <MapPin className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">
                {status === 'INSIDE'
                  ? '🟢 INSIDE BUILDING'
                  : status === 'OUTSIDE'
                  ? '🔴 OUTSIDE BUILDING'
                  : '⚪ LOCATION UNAVAILABLE'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status === 'INSIDE'
                  ? 'You are within the designated provincial capitol perimeter.'
                  : status === 'OUTSIDE'
                  ? 'You are currently outside the designated building zone.'
                  : 'Location tracking disabled or signal unavailable.'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio
                className={`h-4 w-4 ${
                  isSharing ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
                }`}
              />
              <span className="text-xs font-medium text-foreground">
                Location Sharing: <strong>{isSharing ? 'ACTIVE' : 'OFF'}</strong>
              </span>
            </div>

            <Button
              variant={isSharing ? 'destructive' : 'gold'}
              size="sm"
              onClick={isSharing ? stopTracking : startTracking}
              className="h-8 px-3 text-xs font-bold"
            >
              {isSharing ? 'Turn Off' : 'Turn On'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Test Switcher for Easy Verification */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            📍 Quick GPS Simulation (Testing Helper):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulatedPosition(17.6133, 121.7271, 8)}
              className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 h-8"
            >
              Simulate INSIDE (Capitol)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulatedPosition(17.6165, 121.7305, 12)}
              className="text-xs border-rose-500/40 text-rose-700 dark:text-rose-300 h-8"
            >
              Simulate OUTSIDE (300m Away)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => navigate('/my-location')}
          className="rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-amber-500 transition-colors cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
            <Compass className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-foreground">Location Status</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">View GPS accuracy &amp; radius</p>
        </div>

        <div
          onClick={() => navigate('/map')}
          className="rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-amber-500 transition-colors cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
            <MapPin className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-foreground">Office Map</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Explore building geofence</p>
        </div>
      </div>

      {/* Recent Chats Section */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
            Recent Messages
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/chats')}
            className="text-[11px] h-6 px-2 text-amber-600 dark:text-amber-400"
          >
            Open Chats
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-1 divide-y divide-border/50">
          {recentConvos.length > 0 ? (
            recentConvos.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/chats?id=${c.id}`)}
                className="py-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {c.displayName || c.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {c.last_message || 'No messages yet'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-3 text-center">No recent messages.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
