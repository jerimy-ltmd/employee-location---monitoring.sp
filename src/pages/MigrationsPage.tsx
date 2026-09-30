import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert';
import {
  Database,
  Download,
  Copy,
  Check,
  Server,
  FileCode2,
  TableProperties,
  Upload,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  HardDrive,
} from 'lucide-react';

interface ScriptItem {
  id: string;
  name: string;
  dialect: string;
  filename: string;
  content: string;
}

interface TableInspection {
  tableName: string;
  rowCount: number;
  columns: {
    name: string;
    type: string;
    notnull: boolean;
    pk: boolean;
    dflt_value: any;
  }[];
}

export const MigrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scripts');
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('postgres-init');
  const [tables, setTables] = useState<TableInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Custom SQL Runner
  const [customSql, setCustomSql] = useState('SELECT * FROM users LIMIT 5;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [runningSql, setRunningSql] = useState(false);

  // Import JSON
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // External Connection tester
  const [connString, setConnString] = useState('postgresql://postgres:password@localhost:5432/staffmonitor');
  const [connResult, setConnResult] = useState<any>(null);
  const [connError, setConnError] = useState<string | null>(null);

  const fetchMigrationData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('sm_token')}` };
      const [sRes, tRes] = await Promise.all([
        fetch('/api/migrations/scripts', { headers }),
        fetch('/api/migrations/tables', { headers }),
      ]);
      if (sRes.ok) {
        const sList: ScriptItem[] = await sRes.json();
        setScripts(sList);
      }
      if (tRes.ok) {
        setTables(await tRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMigrationData();
  }, []);

  const activeScript = scripts.find((s) => s.id === selectedScriptId) || scripts[0];

  const handleCopy = () => {
    if (!activeScript) return;
    navigator.clipboard.writeText(activeScript.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    if (!activeScript) return;
    const blob = new Blob([activeScript.content], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeScript.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDump = (dialect: 'postgres' | 'mysql' | 'sqlite') => {
    const token = localStorage.getItem('sm_token');
    const url = `/api/migrations/export-sql?dialect=${dialect}`;
    window.open(url, '_blank');
  };

  const handleDownloadJson = () => {
    const token = localStorage.getItem('sm_token');
    window.open('/api/migrations/export-json', '_blank');
  };

  const handleExecuteSql = async () => {
    setRunningSql(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      const res = await fetch('/api/migrations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({ sql: customSql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SQL execution failed');
      setSqlResult(data.result);
      fetchMigrationData();
    } catch (err: any) {
      setSqlError(err.message);
    } finally {
      setRunningSql(false);
    }
  };

  const handleImportJson = async () => {
    if (!jsonInput.trim()) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const res = await fetch('/api/migrations/import-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportStatus(`Successfully restored ${data.totalRecords} records across tables: ${data.importedTables.join(', ')}`);
      setJsonInput('');
      fetchMigrationData();
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleTestConnection = async () => {
    setConnResult(null);
    setConnError(null);
    try {
      const res = await fetch('/api/migrations/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({ connectionString: connString }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection test failed');
      setConnResult(data);
    } catch (err: any) {
      setConnError(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Database className="h-6 w-6 text-amber-500" />
            Database Migrations &amp; External Database App
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Migrate to PostgreSQL, MariaDB, MySQL, Supabase, Neon, or run in your own database management app.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchMigrationData}
          disabled={loading}
          className="h-9 gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Schema
        </Button>
      </div>

      <Tabs defaultValue="scripts" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto p-1">
          <TabsTrigger value="scripts" className="gap-1.5">
            <FileCode2 className="h-4 w-4" />
            SQL Migrations
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-1.5">
            <TableProperties className="h-4 w-4" />
            Schema Inspector
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export &amp; Dump
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="h-4 w-4" />
            Import / Restore
          </TabsTrigger>
          <TabsTrigger value="runner" className="gap-1.5">
            <Server className="h-4 w-4" />
            Custom DB &amp; SQL
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: SQL Migration Scripts */}
        <TabsContent value="scripts" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground">Select Target Dialect:</span>
              {scripts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScriptId(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedScriptId === s.id
                      ? 'bg-[#091D3C] text-amber-400 dark:bg-amber-400 dark:text-slate-950 shadow-sm'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {s.dialect}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied SQL' : 'Copy Script'}
              </Button>
              <Button variant="gold" size="sm" onClick={handleDownloadScript} className="h-8 gap-1.5 text-xs font-semibold">
                <Download className="h-3.5 w-3.5" />
                Download .sql
              </Button>
            </div>
          </div>

          {activeScript && (
            <Card className="border-border shadow-xs overflow-hidden">
              <CardHeader className="bg-muted/20 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-mono text-foreground">{activeScript.filename}</CardTitle>
                    <CardDescription className="text-xs">{activeScript.name} &bull; Compatible with {activeScript.dialect}</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {activeScript.dialect}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-4 text-xs font-mono bg-slate-950 text-slate-100 overflow-x-auto max-h-[500px] leading-relaxed selection:bg-amber-500 selection:text-slate-950">
                  {activeScript.content}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Integration Guide Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="p-3.5 rounded-xl border border-border bg-card">
              <p className="font-bold text-foreground mb-1">🐘 pgAdmin / Supabase / Neon</p>
              <p className="text-[11px] leading-relaxed">
                Copy the <strong>PostgreSQL</strong> script and paste it into the Supabase SQL Editor or pgAdmin Query Tool to create all 11 tables with constraints and indexes.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-card">
              <p className="font-bold text-foreground mb-1">🐬 DBeaver / MySQL Workbench</p>
              <p className="text-[11px] leading-relaxed">
                Execute the <strong>MariaDB / MySQL</strong> script. It includes <code>ENGINE=InnoDB</code>, <code>utf8mb4</code>, and proper timestamp handling.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-card">
              <p className="font-bold text-foreground mb-1">💾 Local SQLite / Turso</p>
              <p className="text-[11px] leading-relaxed">
                Use the <strong>SQLite</strong> schema for lightweight deployments, embedded devices, or edge execution with Cloudflare D1.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Schema Inspector */}
        <TabsContent value="tables" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-border bg-card p-3 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">TOTAL TABLES</span>
              <p className="text-xl font-black text-foreground mt-1">{tables.length}</p>
            </Card>
            <Card className="border-border bg-card p-3 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">TOTAL RECORDS</span>
              <p className="text-xl font-black text-foreground mt-1">
                {tables.reduce((acc, t) => acc + t.rowCount, 0)}
              </p>
            </Card>
            <Card className="border-border bg-card p-3 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">ENGINE</span>
              <p className="text-xl font-black text-amber-500 mt-1">SQLite / SQL.js</p>
            </Card>
            <Card className="border-border bg-card p-3 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">PERSISTENCE</span>
              <p className="text-xl font-black text-emerald-500 mt-1">staffmonitor.sqlite</p>
            </Card>
          </div>

          <div className="space-y-4">
            {tables.map((t) => (
              <Card key={t.tableName} className="border-border shadow-xs overflow-hidden">
                <CardHeader className="p-3.5 bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableProperties className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-sm font-mono text-foreground">{t.tableName}</CardTitle>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {t.rowCount} rows
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">PK</TableHead>
                        <TableHead>Column Name</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead>Nullable</TableHead>
                        <TableHead>Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.columns.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="font-mono text-xs">
                            {c.pk ? <span className="text-amber-500 font-bold">🔑</span> : ''}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            {c.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {c.type}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.notnull ? 'NO' : 'YES'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {c.dflt_value !== null ? String(c.dflt_value) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Export & Dump */}
        <TabsContent value="export" className="space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle>Export Database for Your Database App</CardTitle>
              <CardDescription>
                Download a complete, fully populated SQL dump or portable JSON file to populate your external database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-border bg-card hover:border-amber-500 transition-colors space-y-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                    PG
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">PostgreSQL Dump</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SQL INSERT statements formatted for PostgreSQL, Supabase, Neon.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDump('postgres')}
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PostgreSQL .sql
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card hover:border-amber-500 transition-colors space-y-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                    MY
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">MariaDB / MySQL Dump</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SQL statements compatible with MySQL 8.0+, MariaDB, and AWS Aurora.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDump('mysql')}
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download MariaDB .sql
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card hover:border-amber-500 transition-colors space-y-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    JSON
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">JSON Backup</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Full raw data export for backup, migration, and custom scripts.
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleDownloadJson}
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download JSON Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Import / Restore */}
        <TabsContent value="import" className="space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle>Import &amp; Restore Database Data</CardTitle>
              <CardDescription>
                Restore records from a previously exported StaffMonitor JSON backup into this application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {importStatus && (
                <Alert variant={importStatus.startsWith('Error') ? 'destructive' : 'success'}>
                  {importStatus.startsWith('Error') ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  <AlertTitle>{importStatus.startsWith('Error') ? 'Import Failed' : 'Import Complete'}</AlertTitle>
                  <AlertDescription>{importStatus}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="json-paste">Paste JSON Backup Payload</Label>
                <textarea
                  id="json-paste"
                  rows={8}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"version": "1.0.0", "data": { "users": [...], "buildings": [...] }}'
                  className="w-full rounded-md border border-input bg-card p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <Button
                variant="default"
                onClick={handleImportJson}
                disabled={importing || !jsonInput.trim()}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                {importing ? 'Restoring Database...' : 'Restore Data from JSON'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Custom DB & SQL Console */}
        <TabsContent value="runner" className="space-y-4">
          {/* External Database URL connection test */}
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle>External Database App Connection Details</CardTitle>
              <CardDescription>
                Test your database connection string and parameters for pgAdmin, DBeaver, or custom backends.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="conn-str">Connection URI / Database URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="conn-str"
                    value={connString}
                    onChange={(e) => setConnString(e.target.value)}
                    placeholder="postgresql://user:password@localhost:5432/staffmonitor"
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" onClick={handleTestConnection} className="shrink-0 text-xs">
                    Validate URI
                  </Button>
                </div>
              </div>

              {connResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Valid Connection Parameters
                  </p>
                  <p className="text-muted-foreground">Protocol: <strong>{connResult.protocol}</strong> &bull; Host: <strong>{connResult.host}:{connResult.port}</strong> &bull; Database: <strong>{connResult.database}</strong></p>
                  <p className="text-[11px] text-muted-foreground mt-1">{connResult.message}</p>
                </div>
              )}

              {connError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{connError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Interactive SQL Console */}
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle>Live SQL Execution Console</CardTitle>
              <CardDescription>
                Execute standard SQL queries or test DDL statements on the active database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sql-runner">SQL Statement</Label>
                <textarea
                  id="sql-runner"
                  rows={4}
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  className="w-full rounded-md border border-input bg-card p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleExecuteSql}
                  disabled={runningSql}
                  className="gap-1.5 font-semibold text-xs"
                >
                  <Play className="h-3.5 w-3.5" />
                  {runningSql ? 'Executing...' : 'Run Query'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomSql('SELECT id, employee_id, name, email, role, department FROM users;')}
                  className="text-xs"
                >
                  Query Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomSql('SELECT * FROM buildings;')}
                  className="text-xs"
                >
                  Query Buildings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomSql('SELECT * FROM location_records ORDER BY id DESC LIMIT 5;')}
                  className="text-xs"
                >
                  Query Locations
                </Button>
              </div>

              {sqlError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{sqlError}</AlertDescription>
                </Alert>
              )}

              {sqlResult && (
                <div className="mt-4 rounded-xl border border-border bg-slate-950 p-4 text-xs font-mono text-slate-100 max-h-72 overflow-auto">
                  <pre>{JSON.stringify(sqlResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
