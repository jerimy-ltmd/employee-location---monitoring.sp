import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LeafletMap } from '../components/map/LeafletMap';
import { SendPingDialog } from '../components/common/SendPingDialog';
import { SetupWizardModal } from '../components/common/SetupWizardModal';
import { User, Building, AuditLog } from '../types';
import { formatPhilippineTime } from '../lib/utils';
import {
  Users,
  Compass,
  Building2,
  BellRing,
  MessageSquare,
  AlertTriangle,
  History,
  Sparkles,
  RefreshCw,
  Search,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { liveEmployees, setLiveEmployees } = useSocket();

  const [building, setBuilding] = useState<Building | null>(null);
  const [recentActivities, setRecentActivities] = useState<AuditLog[]>([]);
  const [unackedPingsCount, setUnackedPingsCount] = useState(0);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [pingTarget, setPingTarget] = useState<User | null>(null);
  const [showPingDialog, setShowPingDialog] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sm_token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch building
      const bRes = await fetch('/api/building', { headers });
      if (bRes.ok) {
        setBuilding(await bRes.json());
      }

      // 2. Fetch live employees
      const eRes = await fetch('/api/locations/live', { headers });
      if (eRes.ok) {
        const empList: User[] = await eRes.json();
        setLiveEmployees(empList);
      }

      // 3. Fetch recent activity audit logs
      const aRes = await fetch('/api/reports/activity', { headers });
      if (aRes.ok) {
        const logs: AuditLog[] = await aRes.json();
        setRecentActivities(logs.slice(0, 10));
      }

      // 4. Fetch pings to count unacknowledged
      const pRes = await fetch('/api/pings', { headers });
      if (pRes.ok) {
        const pings = await pRes.json();
        const unacked = pings.filter((p: any) => p.status === 'PENDING').length;
        setUnackedPingsCount(unacked);
      }

      // 5. Fetch conversations count
      const cRes = await fetch('/api/conversations', { headers });
      if (cRes.ok) {
        const convos = await cRes.json();
        setActiveChatsCount(convos.length);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live statistics
  const totalEmployees = liveEmployees.filter((e) => e.role === 'EMPLOYEE').length;
  const insideCount = liveEmployees.filter((e) => e.role === 'EMPLOYEE' && e.location_status === 'INSIDE').length;
  const outsideCount = liveEmployees.filter((e) => e.role === 'EMPLOYEE' && e.location_status === 'OUTSIDE').length;
  const unavailableCount = liveEmployees.filter(
    (e) => e.role === 'EMPLOYEE' && (e.location_status === 'LOCATION_UNAVAILABLE' || !e.location_status)
  ).length;

  const filteredEmployees = liveEmployees.filter((e) => {
    if (!searchFilter) return true;
    return (
      e.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.department.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  const handlePingAction = (emp: User) => {
    setPingTarget(emp);
    setShowPingDialog(true);
  };

  const handleChatAction = async (emp: User) => {
    try {
      const res = await fetch('/api/conversations/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({ targetUserId: emp.id }),
      });
      const data = await res.json();
      if (data.conversationId) {
        navigate(`/chats?id=${data.conversationId}`);
      }
    } catch (err) {
      navigate('/chats');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Building &amp; Employee Monitoring Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {building?.name || 'Provincial Capitol Compound'} &bull; Real-time Perimeter Control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => setShowSetupWizard(true)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Setup Wizard
          </Button>
        </div>
      </div>

      {/* 6 Key Metrics Cards (Section 6) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Employees */}
        <Card className="border-border shadow-xs hover:border-amber-500/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">TOTAL STAFF</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">{totalEmployees}</span>
              <span className="text-[10px] text-muted-foreground">Active</span>
            </div>
          </CardContent>
        </Card>

        {/* Inside Building */}
        <Card className="border-border shadow-xs bg-emerald-500/5 hover:border-emerald-500/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">INSIDE</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {insideCount}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-500">
                {totalEmployees > 0 ? `${Math.round((insideCount / totalEmployees) * 100)}%` : '0%'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Outside Building */}
        <Card className="border-border shadow-xs bg-rose-500/5 hover:border-rose-500/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-400">OUTSIDE</span>
              <span className="h-2 w-2 rounded-full bg-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700 dark:text-rose-400">
                {outsideCount}
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-500">Exited</span>
            </div>
          </CardContent>
        </Card>

        {/* Location Unavailable */}
        <Card className="border-border shadow-xs hover:border-border transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">OFFLINE</span>
              <span className="h-2 w-2 rounded-full bg-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">{unavailableCount}</span>
              <span className="text-[10px] text-muted-foreground">Unshared</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Chats */}
        <Card
          onClick={() => navigate('/chats')}
          className="border-border shadow-xs hover:border-amber-500/50 transition-colors cursor-pointer"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">CHATS</span>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">{activeChatsCount}</span>
              <span className="text-[10px] text-muted-foreground">Channels</span>
            </div>
          </CardContent>
        </Card>

        {/* Unacknowledged Pings */}
        <Card
          onClick={() => navigate('/reports')}
          className={`border-border shadow-xs transition-colors cursor-pointer ${
            unackedPingsCount > 0 ? 'bg-amber-500/10 border-amber-500/50' : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                ACTIVE PINGS
              </span>
              <BellRing
                className={`h-4 w-4 ${
                  unackedPingsCount > 0 ? 'text-amber-500 animate-bounce' : 'text-muted-foreground'
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {unackedPingsCount}
              </span>
              <span className="text-[10px] text-muted-foreground">Pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Interactive Map + Real-time Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Interactive Map Column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Geofenced Building Map (100m Perimeter)
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Center: {building?.latitude.toFixed(4)}, {building?.longitude.toFixed(4)}
            </span>
          </div>

          <LeafletMap
            building={building}
            employees={liveEmployees}
            onPingEmployee={handlePingAction}
            onChatEmployee={handleChatAction}
            onViewHistory={(emp) => navigate(`/history?empId=${emp.id}`)}
            height="520px"
          />
        </div>

        {/* Real-time Employee Status Column */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Live Employees ({filteredEmployees.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employees')}
              className="text-xs h-7 px-2"
            >
              All Directory
            </Button>
          </div>

          {/* Quick Search Filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or department..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-card pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex-1 rounded-xl border border-border bg-card p-3 shadow-xs overflow-y-auto max-h-[460px] space-y-2">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-[#091D3C] text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/30">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{emp.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge status={emp.location_status} />
                  <button
                    onClick={() => handlePingAction(emp)}
                    title="Send Urgent Ping"
                    className="h-7 w-7 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <BellRing className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleChatAction(emp)}
                    title="Send Message"
                    className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed (Section 6 & 25) */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">
              Recent System &amp; Perimeter Activity
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/history')}
            className="text-xs h-7"
          >
            View History Log
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => {
                const isOutside = act.action === 'EVENT_WENT_OUTSIDE';
                const isInside = act.action === 'EVENT_RETURNED_INSIDE';
                const isPing = act.action.includes('PING');

                return (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {isOutside && <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />}
                      {isInside && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                      {isPing && <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />}
                      {!isOutside && !isInside && !isPing && (
                        <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-foreground">
                          {act.user_name || 'System'}
                        </span>
                        <span className="text-muted-foreground ml-1.5">
                          {act.metadata || act.action}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0 ml-4">
                      {formatPhilippineTime(act.created_at)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No activity recorded yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ping Dialog */}
      <SendPingDialog
        employee={pingTarget}
        open={showPingDialog}
        onOpenChange={setShowPingDialog}
        onSuccess={loadData}
      />

      {/* Setup Wizard Modal */}
      <SetupWizardModal
        open={showSetupWizard}
        onOpenChange={setShowSetupWizard}
        onComplete={loadData}
      />
    </div>
  );
};
