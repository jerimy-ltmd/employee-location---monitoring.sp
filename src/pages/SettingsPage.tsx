import React, { useState, useEffect } from 'react';
import { Building } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { LeafletMap } from '../components/map/LeafletMap';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert';
import { Settings, Shield, MapPin, Database, CheckCircle2, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [building, setBuilding] = useState<Building | null>(null);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState(17.6132);
  const [longitude, setLongitude] = useState(121.7270);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [accuracyThreshold, setAccuracyThreshold] = useState(40);

  // System Settings
  const [retentionDays, setRetentionDays] = useState('90');
  const [trackingInterval, setTrackingInterval] = useState('30');
  const [minMovement, setMinMovement] = useState('25');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('sm_token')}` };
      const [bRes, sRes] = await Promise.all([
        fetch('/api/building', { headers }),
        fetch('/api/settings', { headers }),
      ]);
      if (bRes.ok) {
        const b: Building = await bRes.json();
        setBuilding(b);
        setName(b.name);
        setLatitude(b.latitude);
        setLongitude(b.longitude);
        setRadiusMeters(b.radius_meters);
        setAccuracyThreshold(b.accuracy_threshold);
      }
      if (sRes.ok) {
        const s = await sRes.json();
        if (s.retention_days) setRetentionDays(s.retention_days);
        if (s.tracking_interval_seconds) setTrackingInterval(s.tracking_interval_seconds);
        if (s.min_movement_meters) setMinMovement(s.min_movement_meters);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/building', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({
          name,
          latitude: Number(latitude),
          longitude: Number(longitude),
          radius_meters: Number(radiusMeters),
          accuracy_threshold: Number(accuracyThreshold),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBuilding(data.building);
        setSuccessMsg('Building perimeter geofence updated successfully.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({
          retention_days: retentionDays,
          tracking_interval_seconds: trackingInterval,
          min_movement_meters: minMovement,
        }),
      });
      setSuccessMsg('Privacy & retention policies saved.');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePurge = async () => {
    if (!window.confirm(`Purge all location records older than ${retentionDays} days?`)) return;
    try {
      const res = await fetch('/api/settings/purge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` },
      });
      const data = await res.json();
      setPurgeMsg(`Successfully deleted ${data.deletedCount} expired location records.`);
    } catch (err) {
      alert('Failed to purge data.');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-amber-500" />
          Building Geofence &amp; System Configuration
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Define building boundaries, GPS tolerance thresholds, and data privacy retention rules.
        </p>
      </div>

      {successMsg && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Configuration Saved</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Database Migrations & External App Integration Link Card */}
      <Card
        onClick={() => navigate('/migrations')}
        className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-background to-card hover:border-amber-500 transition-all cursor-pointer shadow-xs"
      >
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#091D3C] text-amber-400 border border-amber-500/30 shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Database Migrations &amp; External Database App</h3>
                <span className="rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  SQL MIGRATIONS READY
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download PostgreSQL, MariaDB/MySQL, and SQLite DDL scripts or export SQL dumps to connect pgAdmin, DBeaver, or Supabase.
              </p>
            </div>
          </div>
          <Button variant="gold" size="sm" className="shrink-0 gap-1 text-xs font-semibold">
            Open Migration Hub
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Geofence Form & Map Picker */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5 text-amber-500" />
            <CardTitle>Building Geofence Parameters</CardTitle>
          </div>
          <CardDescription>
            Click or drag the building centroid on the interactive map to adjust coordinates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveGeofence} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Official Building / Campus Name</Label>
              <Input
                id="b-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-lat">Latitude</Label>
                <Input
                  id="b-lat"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-lng">Longitude</Label>
                <Input
                  id="b-lng"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-rad">Radius (Meters)</Label>
                <Input
                  id="b-rad"
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-acc">Accuracy Filter (Meters)</Label>
                <Input
                  id="b-acc"
                  type="number"
                  value={accuracyThreshold}
                  onChange={(e) => setAccuracyThreshold(parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Interactive Map with draggable marker */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Interactive Perimeter Preview (Click map to reposition centroid):
              </p>
              <LeafletMap
                building={{
                  id: 1,
                  name,
                  latitude,
                  longitude,
                  radius_meters: radiusMeters,
                  accuracy_threshold: accuracyThreshold,
                  created_at: '',
                  updated_at: '',
                }}
                employees={[]}
                isEditable={true}
                onGeofenceChange={(newLat, newLng) => {
                  setLatitude(parseFloat(newLat.toFixed(5)));
                  setLongitude(parseFloat(newLng.toFixed(5)));
                }}
                height="320px"
              />
            </div>

            <Button type="submit" variant="default" disabled={saving}>
              {saving ? 'Updating Perimeter...' : 'Save Geofence Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Privacy and Retention Policy (Section 26) */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-emerald-500" />
            <CardTitle>Privacy &amp; Data Retention Policy</CardTitle>
          </div>
          <CardDescription>
            Enforce employee data privacy by automatically removing historical location logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ret-days">Data Retention Window</Label>
                <select
                  id="ret-days"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days (Recommended)</option>
                  <option value="180">180 Days</option>
                  <option value="365">1 Year</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="track-int">GPS Sync Interval (Seconds)</Label>
                <Input
                  id="track-int"
                  type="number"
                  value={trackingInterval}
                  onChange={(e) => setTrackingInterval(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="min-mov">Min Movement (Meters)</Label>
                <Input
                  id="min-mov"
                  type="number"
                  value={minMovement}
                  onChange={(e) => setMinMovement(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border border-border leading-relaxed">
              <strong className="text-foreground">Strict Privacy Guarantees:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Employees can only review their own location logs.</li>
                <li>Location history is never published publicly or shared outside management.</li>
                <li>Records older than {retentionDays} days are scheduled for permanent deletion.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
              <Button type="submit" variant="default">
                Save Policy Parameters
              </Button>

              <Button type="button" variant="outline" onClick={handlePurge} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Purge Expired Records Now
              </Button>
            </div>
            {purgeMsg && <p className="text-xs text-emerald-600 font-semibold">{purgeMsg}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
