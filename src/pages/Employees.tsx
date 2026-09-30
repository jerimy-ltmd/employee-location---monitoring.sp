import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/Dialog';
import { SendPingDialog } from '../components/common/SendPingDialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { formatPhilippineDateTime } from '../lib/utils';
import {
  UserPlus,
  Search,
  MessageSquare,
  BellRing,
  MoreVertical,
  History,
  KeyRound,
  UserX,
  UserCheck,
  Edit2,
  RefreshCw,
  Building,
} from 'lucide-react';

export const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<User | null>(null);

  // Ping Modal
  const [pingTarget, setPingTarget] = useState<User | null>(null);
  const [showPingModal, setShowPingModal] = useState(false);

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employee_id: '',
    password: '',
    role: 'EMPLOYEE',
    department: 'Provincial Engineering Office',
    position: 'Staff',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` },
      });
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      employee_id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      password: 'employee123',
      role: 'EMPLOYEE',
      department: 'Provincial Engineering Office',
      position: 'Staff Member',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (emp: User) => {
    setSelectedEmp(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      employee_id: emp.employee_id,
      password: '',
      role: emp.role,
      department: emp.department,
      position: emp.position,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create employee');
      setShowAddModal(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update employee');
      setShowEditModal(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (emp: User) => {
    const nextState = emp.is_active === 1 ? 0 : 1;
    try {
      await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({
          ...emp,
          is_active: nextState,
        }),
      });
      fetchEmployees();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleResetPassword = async (emp: User) => {
    if (!window.confirm(`Reset password for ${emp.name} to "employee123"?`)) return;
    try {
      const res = await fetch(`/api/employees/${emp.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({ password: 'employee123' }),
      });
      const data = await res.json();
      alert(data.message || 'Password reset successfully.');
    } catch (err) {
      alert('Password reset failed.');
    }
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
    } catch (err) {
      navigate('/chats');
    }
  };

  // Filter employees
  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || emp.location_status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Employee Directory &amp; Status Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage organizational staff records, status monitoring, and authentication keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEmployees}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleOpenAdd}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground"
              >
                <option value="ALL">All Departments</option>
                <option value="Executive Management">Executive Management</option>
                <option value="Provincial Engineering Office">Provincial Engineering Office</option>
                <option value="Human Resources & Records">Human Resources &amp; Records</option>
                <option value="General Services Office">General Services Office</option>
                <option value="Information Technology Division">IT Division</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground"
              >
                <option value="ALL">All Perimeter Statuses</option>
                <option value="INSIDE">🟢 Inside Building</option>
                <option value="OUTSIDE">🔴 Outside Building</option>
                <option value="LOCATION_UNCERTAIN">🟡 Location Uncertain</option>
                <option value="LOCATION_UNAVAILABLE">⚪ Offline / Unavailable</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden md:block rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Details</TableHead>
              <TableHead>Department &amp; Position</TableHead>
              <TableHead>Perimeter Status</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#091D3C] text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs leading-none">
                          {emp.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {emp.employee_id} &bull; {emp.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-foreground font-medium">{emp.position}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                  </TableCell>
                  <TableCell>
                    <Badge status={emp.location_status} />
                  </TableCell>
                  <TableCell>
                    {emp.is_active === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Disabled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {formatPhilippineDateTime(emp.last_location_update)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setPingTarget(emp);
                          setShowPingModal(true);
                        }}
                        title="Send Urgent Ping"
                        className="h-8 px-2 text-xs"
                      >
                        <BellRing className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleChat(emp)}
                        title="Open Direct Chat"
                        className="h-8 px-2 text-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/history?empId=${emp.id}`)}
                        title="View Location History"
                        className="h-8 px-2 text-xs"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(emp)}
                        title="Edit Details"
                        className="h-8 px-2 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(emp)}
                        title="Reset Password"
                        className="h-8 px-2 text-xs text-amber-600"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(emp)}
                        title={emp.is_active === 1 ? 'Disable Account' : 'Enable Account'}
                        className={`h-8 px-2 text-xs ${emp.is_active === 1 ? 'text-red-500' : 'text-emerald-500'}`}
                      >
                        {emp.is_active === 1 ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                  No matching employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Responsive Cards View (Section 33: Convert tables to Employee Cards on phones) */}
      <div className="md:hidden space-y-3">
        {filtered.length > 0 ? (
          filtered.map((emp) => (
            <Card key={emp.id} className="border-border shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-[#091D3C] text-amber-400 font-bold text-sm flex items-center justify-center shrink-0 border border-amber-500/30">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.position}</p>
                      <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                    </div>
                  </div>
                  <Badge status={emp.location_status} />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>ID: <strong className="text-foreground">{emp.employee_id}</strong></span>
                  <span>{emp.is_active === 1 ? '🟢 Active' : '🔴 Disabled'}</span>
                </div>

                {/* Mobile Quick Action Buttons (Min touch 44px) */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setPingTarget(emp);
                      setShowPingModal(true);
                    }}
                    className="min-h-[44px] text-xs font-semibold"
                  >
                    <BellRing className="mr-1 h-3.5 w-3.5" />
                    Ping
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleChat(emp)}
                    className="min-h-[44px] text-xs font-semibold"
                  >
                    <MessageSquare className="mr-1 h-3.5 w-3.5" />
                    Chat
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/history?empId=${emp.id}`)}
                    className="min-h-[44px] text-xs"
                  >
                    <History className="mr-1 h-3.5 w-3.5" />
                    Trail
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(emp)}
                    className="min-h-[44px] text-xs"
                  >
                    <Edit2 className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center py-8 text-xs text-muted-foreground">
            No employees found matching filter criteria.
          </p>
        )}
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Register an official employee account for location tracking and secure team communication.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveAdd} className="space-y-3 py-2">
          {formError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Dela Cruz"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-id">Employee ID</Label>
              <Input
                id="add-id"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="add-email">Email Address</Label>
            <Input
              id="add-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="juan@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="add-dept">Department</Label>
              <Input
                id="add-dept"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-pos">Position / Title</Label>
              <Input
                id="add-pos"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="add-pass">Initial Password</Label>
            <Input
              id="add-pass"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="default" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogHeader>
          <DialogTitle>Edit Employee Details</DialogTitle>
          <DialogDescription>
            Update employee name, role, department or active status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveEdit} className="space-y-3 py-2">
          {formError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
              {formError}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-dept">Department</Label>
              <Input
                id="edit-dept"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-pos">Position</Label>
              <Input
                id="edit-pos"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="default" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Urgent Ping Dialog */}
      <SendPingDialog
        employee={pingTarget}
        open={showPingModal}
        onOpenChange={setShowPingModal}
      />
    </div>
  );
};
