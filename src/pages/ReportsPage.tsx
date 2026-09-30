import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatPhilippineDateTime, formatPhilippineTime } from '../lib/utils';
import { FileBarChart, Download, Printer, Calendar, RefreshCw } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data states
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [outsideEvents, setOutsideEvents] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [pingReports, setPingReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('sm_token')}` };
      if (activeTab === 'daily') {
        const res = await fetch(`/api/reports/daily?date=${targetDate}`, { headers });
        if (res.ok) setDailyData((await res.json()).rows);
      } else if (activeTab === 'outside') {
        const res = await fetch('/api/reports/outside-events', { headers });
        if (res.ok) setOutsideEvents(await res.json());
      } else if (activeTab === 'activity') {
        const res = await fetch('/api/reports/activity', { headers });
        if (res.ok) setActivityLogs(await res.json());
      } else if (activeTab === 'pings') {
        const res = await fetch('/api/reports/pings', { headers });
        if (res.ok) setPingReports(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, targetDate]);

  const handleExportCsv = () => {
    const token = localStorage.getItem('sm_token');
    const url = `/api/reports/export-csv?type=${activeTab}&date=${targetDate}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* Header bar (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-amber-500" />
            Official Monitoring Reports &amp; Records
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit-compliant reporting for attendance validation, perimeter departures, and emergency pings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / PDF
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1">
            <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
            <TabsTrigger value="outside">Outside Events</TabsTrigger>
            <TabsTrigger value="pings">Ping Acknowledgements</TabsTrigger>
            <TabsTrigger value="activity">System Audit Logs</TabsTrigger>
          </TabsList>

          {activeTab === 'daily' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs text-foreground"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Daily Employee Location Report */}
        <TabsContent value="daily">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Total Readings</TableHead>
                  <TableHead>Inside Counts</TableHead>
                  <TableHead>Outside Counts</TableHead>
                  <TableHead>Final Status</TableHead>
                  <TableHead>Last Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.length > 0 ? (
                  dailyData.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <p className="font-bold text-xs text-foreground">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.employee_id}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.department}</TableCell>
                      <TableCell className="text-xs font-mono font-bold">{r.total_readings}</TableCell>
                      <TableCell className="text-xs font-mono text-emerald-600 font-bold">{r.inside_count}</TableCell>
                      <TableCell className="text-xs font-mono text-rose-600 font-bold">{r.outside_count}</TableCell>
                      <TableCell>
                        <Badge status={r.final_status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {r.latest_reading_time ? formatPhilippineDateTime(r.latest_reading_time) : 'No Data'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      No records for this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 2: Outside-Building Events */}
        <TabsContent value="outside">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time of Departure</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Event Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outsideEvents.length > 0 ? (
                  outsideEvents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatPhilippineDateTime(e.recorded_at)}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-xs text-foreground">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground">{e.employee_id}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.department}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {e.latitude?.toFixed(4)}, {e.longitude?.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 px-2.5 py-0.5 text-xs font-semibold dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                          🔴 WENT OUTSIDE
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                      No outside building departure events recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 3: Ping / Communication Report */}
        <TabsContent value="pings">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispatched At</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acknowledged At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pingReports.length > 0 ? (
                  pingReports.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatPhilippineDateTime(p.sent_at)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {p.sender_name}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-xs text-foreground">{p.recipient_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.recipient_employee_id}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.recipient_department}
                      </TableCell>
                      <TableCell>
                        {p.status === 'ACKNOWLEDGED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            🟢 ACKNOWLEDGED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                            ⚠️ PENDING RESPONSE
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.acknowledged_at ? formatPhilippineDateTime(p.acknowledged_at) : 'Waiting...'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No urgent pings logged.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 4: System Audit Logs */}
        <TabsContent value="activity">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatPhilippineDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {log.user_name || 'System Service'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-amber-600 dark:text-amber-400">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.metadata}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                      No system audit logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
