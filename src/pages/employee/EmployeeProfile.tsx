import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/Card';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { UserCheck, Shield, Bell, KeyRound, LogOut, CheckCircle2 } from 'lucide-react';

export const EmployeeProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  // Notification toggles (Section 16)
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPings, setNotifPings] = useState(true);
  const [notifStatus, setNotifStatus] = useState(true);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPwdMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-5 pb-16 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-amber-500" />
          My Profile &amp; Preferences
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          View organizational credentials and adjust security controls.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#091D3C] text-amber-400 font-bold text-xl flex items-center justify-center border-2 border-amber-500/40 shrink-0">
              {user?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{user?.name}</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-block rounded-xs bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  {user?.employee_id}
                </span>
                <span className="inline-block rounded-xs bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                  {user?.position}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">DEPARTMENT</span>
              <span className="font-semibold text-foreground">{user?.department}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">ROLE</span>
              <span className="font-semibold text-foreground">{user?.role}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings (Section 16) */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm">Notification Channels</CardTitle>
          </div>
          <CardDescription>
            Configure real-time in-app alerts and browser notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-xs">
          <label className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border cursor-pointer">
            <div>
              <p className="font-semibold text-foreground">Urgent Management Pings</p>
              <p className="text-[11px] text-muted-foreground">High priority audio and visual alerts</p>
            </div>
            <input
              type="checkbox"
              checked={notifPings}
              onChange={(e) => setNotifPings(e.target.checked)}
              className="h-4 w-4 text-amber-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border cursor-pointer">
            <div>
              <p className="font-semibold text-foreground">New Team Messages</p>
              <p className="text-[11px] text-muted-foreground">Direct chats and group channel messages</p>
            </div>
            <input
              type="checkbox"
              checked={notifMessages}
              onChange={(e) => setNotifMessages(e.target.checked)}
              className="h-4 w-4 text-amber-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border cursor-pointer">
            <div>
              <p className="font-semibold text-foreground">Building Status Changes</p>
              <p className="text-[11px] text-muted-foreground">Perimeter enter and exit event logs</p>
            </div>
            <input
              type="checkbox"
              checked={notifStatus}
              onChange={(e) => setNotifStatus(e.target.checked)}
              className="h-4 w-4 text-amber-500 rounded"
            />
          </label>
        </CardContent>
      </Card>

      {/* Password Reset */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm">Security &amp; Password</CardTitle>
          </div>
          <CardDescription>
            Update your account password for portal access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {pwdMsg && (
              <p
                className={`text-xs p-2.5 rounded-lg border ${
                  pwdMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {pwdMsg.text}
              </p>
            )}

            <div className="space-y-1">
              <Label htmlFor="cur-pass">Current Password</Label>
              <Input
                id="cur-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-pass">New Password</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="conf-pass">Confirm New Password</Label>
              <Input
                id="conf-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="default" disabled={savingPwd} className="w-full text-xs">
              {savingPwd ? 'Updating Password...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout Button */}
      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 h-11"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out of Account
      </Button>
    </div>
  );
};
