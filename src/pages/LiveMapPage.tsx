import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { LeafletMap } from '../components/map/LeafletMap';
import { SendPingDialog } from '../components/common/SendPingDialog';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { User, Building } from '../types';
import { MapPin, Search, Compass, BellRing, MessageSquare, RefreshCw } from 'lucide-react';

export const LiveMapPage: React.FC = () => {
  const navigate = useNavigate();
  const { liveEmployees, setLiveEmployees } = useSocket();

  const [building, setBuilding] = useState<Building | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Ping Modal
  const [pingTarget, setPingTarget] = useState<User | null>(null);
  const [showPingModal, setShowPingModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('sm_token')}` };
      const [bRes, eRes] = await Promise.all([
        fetch('/api/building', { headers }),
        fetch('/api/locations/live', { headers }),
      ]);
      if (bRes.ok) setBuilding(await bRes.json());
      if (eRes.ok) setLiveEmployees(await eRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = liveEmployees.filter((e) => {
    if (e.role !== 'EMPLOYEE') return false;
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || e.location_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handlePing = (emp: User) => {
    setPingTarget(emp);
    setShowPingModal(true);
  };

  const handleChat = async (emp: User) => {
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
    } catch {
      navigate('/chats');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Compass className="h-6 w-6 text-amber-500" />
            Live Perimeter Map
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {building?.name || 'Provincial Capitol Compound'} &bull; Real-time GPS Tracking
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-9 gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Coordinates
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Employee Filter List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground"
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {['ALL', 'INSIDE', 'OUTSIDE', 'LOCATION_UNAVAILABLE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[#091D3C] text-white dark:bg-amber-400 dark:text-slate-950'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'INSIDE' ? 'Inside' : st === 'OUTSIDE' ? 'Outside' : 'Offline'}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((emp) => {
                const isSelected = selectedEmpId === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmpId(emp.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.department}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Badge status={emp.location_status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Full Map */}
        <div className="lg:col-span-3">
          <LeafletMap
            building={building}
            employees={liveEmployees}
            selectedEmployeeId={selectedEmpId}
            onPingEmployee={handlePing}
            onChatEmployee={handleChat}
            onViewHistory={(emp) => navigate(`/history?empId=${emp.id}`)}
            height="620px"
          />
        </div>
      </div>

      <SendPingDialog
        employee={pingTarget}
        open={showPingModal}
        onOpenChange={setShowPingModal}
      />
    </div>
  );
};
