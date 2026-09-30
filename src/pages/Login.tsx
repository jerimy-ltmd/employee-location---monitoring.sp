import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Building2, ShieldCheck, Lock, Mail, Eye, EyeOff, UserCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [credential, setCredential] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential || !password) {
      setError('Please provide your email/employee ID and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(credential, password);
      // Auth hook will load user, redirect according to role
      const stored = localStorage.getItem('sm_token');
      if (stored) {
        const payload = JSON.parse(atob(stored.split('.')[1]));
        if (payload.role === 'ADMINISTRATOR') {
          navigate('/dashboard');
        } else {
          navigate('/home');
        }
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillAccount = (userEmail: string, pass: string) => {
    setCredential(userEmail);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 bg-gradient-to-b from-[#091D3C]/5 via-background to-background">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#091D3C] text-amber-400 shadow-md border-2 border-amber-500/40 mb-3">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            STAFF<span className="text-amber-500">MONITOR</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Provincial Government Internal Employee Location &amp; Communication Portal
          </p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Sign In</CardTitle>
              <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                SSL Encrypted
              </span>
            </div>
            <CardDescription>
              Enter your official email or employee ID to access your workplace account.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="credential">Email / Employee ID</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="credential"
                    type="text"
                    placeholder="admin@example.com or EMP-101"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={loading}
                className="w-full h-11 text-sm font-semibold tracking-wide"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </Button>
            </CardContent>
          </form>

          {/* Quick Demo Test Accounts (Section 38 Sample Data) */}
          <CardFooter className="flex-col items-start border-t border-border pt-4 bg-muted/20 rounded-b-xl">
            <div className="w-full">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-amber-500" />
                Quick Test Sample Accounts (Click to Fill):
              </p>
              <div className="grid grid-cols-2 gap-2 w-full text-xs">
                <button
                  type="button"
                  onClick={() => fillAccount('admin@example.com', 'admin123')}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-foreground text-[11px]">Administrator</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">admin@example.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillAccount('juan@example.com', 'employee123')}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-foreground text-[11px]">Juan Dela Cruz</p>
                  <p className="text-[10px] text-muted-foreground">juan@example.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillAccount('maria@example.com', 'employee123')}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-foreground text-[11px]">Maria Santos</p>
                  <p className="text-[10px] text-muted-foreground">maria@example.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillAccount('pedro@example.com', 'employee123')}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-foreground text-[11px]">Pedro Reyes</p>
                  <p className="text-[10px] text-muted-foreground">pedro@example.com</p>
                </button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Location data is accessed only when permission is explicitly granted by the user.
        </p>
      </div>
    </div>
  );
};
