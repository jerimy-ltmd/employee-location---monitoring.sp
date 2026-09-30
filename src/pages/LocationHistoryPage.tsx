import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LocationRecord, User } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { formatPhilippineDateTime } from '../lib/utils';
import { History, Search, Filter, RefreshCw, Calendar, MapPin } from 'lucide-react';

export const LocationHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmpId = searchParams.get('empId') || 'ALL';

  const [history, setHistory] = useState<LocationRecord[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(initialEmpId);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('sm_token')}` };

      // Load employees for filter
      const empRes = await fetch('/api/employees', { headers });
      if (empRes.ok) {
        setEmployees(await empRes.json());
      }

      let url = '/api/locations/history?limit=150';
      if (selectedUser !== 'ALL') url += `&userId=${selectedUser}`;
      if (selectedDept !== 'ALL') url += `&department=${encodeURIComponent(selectedDept)}`;
      if (selectedStatus !== 'ALL') url += `&status=${selectedStatus}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedUser, selectedDept, selectedStatus]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-amber-500" />
            Location Trail &amp; Audit History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Historical log of employee GPS coordinates, timestamped perimeter entries, and exits.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading} className="h-9 gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Employee Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Staff Member</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground"
              >
                <option value="ALL">All Staff Members</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground"
              >
                <option value="ALL">All Departments</option>
                <option value="Provincial Engineering Office">Provincial Engineering Office</option>
                <option value="Human Resources & Records">Human Resources &amp; Records</option>
                <option value="General Services Office">General Services Office</option>
                <option value="Information Technology Division">IT Division</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Perimeter Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground"
              >
                <option value="ALL">All Statuses</option>
                <option value="INSIDE">🟢 Inside Building</option>
                <option value="OUTSIDE">🔴 Outside Building</option>
                <option value="LOCATION_UNCERTAIN">🟡 Location Uncertain</option>
                <option value="LOCATION_UNAVAILABLE">⚪ Location Unavailable</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp (PHT)</TableHead>
              <TableHead>Staff Member</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Perimeter Status</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>GPS Accuracy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length > 0 ? (
              history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatPhilippineDateTime(record.recorded_at)}
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-xs text-foreground">{record.name}</p>
                    <p className="text-[10px] text-muted-foreground">{record.employee_id}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {record.department || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge status={record.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    ±{Math.round(record.accuracy)} meters
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                  No location history logs recorded matching your filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
