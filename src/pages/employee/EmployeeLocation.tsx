import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import { Building, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { LeafletMap } from '../../components/map/LeafletMap';
import { formatPhilippineTime } from '../../lib/utils';
import {
  Compass,
  MapPin,
  ShieldCheck,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const EmployeeLocation: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    isSharing,
    permissionState,
    currentCoords,
    status,
    errorMessage,
    lastSentTime,
    startTracking,
    stopTracking,
    setSimulatedPosition,
  } = useLocationTracker();

  const [building, setBuilding] = useState<Building | null>(null);

  useEffect(() => {
    fetch('/api/building', {
      headers: { Authorization: `Bearer ${localStorage.getItem('sm_token')}` },
    })
      .then((res) => res.json())
      .then((b) => setBuilding(b))
      .catch(() => {});
  }, []);

  const employeeMarker: User[] = user
    ? [
        {
          ...user,
          location_status: status,
          latitude: currentCoords?.latitude ?? null,
          longitude: currentCoords?.longitude ?? null,
          accuracy: currentCoords?.accuracy ?? null,
          last_location_update: lastSentTime ? lastSentTime.toISOString() : null,
        },
      ]
    : [];

  return (
    <div className="space-y-4 pb-16 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Compass className="h-5 w-5 text-amber-500" />
          My Location &amp; Perimeter Status
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Explicit employee location sharing in compliance with organization privacy controls.
        </p>
      </div>

      {/* Main Status Display (Section 3 & 20) */}
      <Card
        className={`border-2 text-center p-6 transition-all ${
          status === 'INSIDE'
            ? 'border-emerald-500/80 bg-emerald-500/5'
            : status === 'OUTSIDE'
            ? 'border-rose-500/80 bg-rose-500/5'
            : 'border-border bg-card'
        }`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-sm border border-border">
          {status === 'INSIDE' ? (
            <span className="text-3xl">🟢</span>
          ) : status === 'OUTSIDE' ? (
            <span className="text-3xl">🔴</span>
          ) : (
            <span className="text-3xl">⚪</span>
          )}
        </div>

        <h2 className="mt-4 text-xl font-black text-foreground">
          {status === 'INSIDE'
            ? 'INSIDE PERIMETER'
            : status === 'OUTSIDE'
            ? 'OUTSIDE PERIMETER'
            : 'LOCATION UNAVAILABLE'}
        </h2>

        {/* Section 3 Mandatory Disclosure text */}
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
          {isSharing ? (
            <>
              <strong className="text-emerald-600 dark:text-emerald-400">
                🟢 LOCATION SHARING ACTIVE
              </strong>
              <br />
              Your location is currently being used to determine whether you are inside or outside the designated office area.
            </>
          ) : (
            <>
              <strong className="text-slate-500">
                ⚪ LOCATION UNAVAILABLE
              </strong>
              <br />
              Location permission is disabled. Please enable location access if location monitoring is required by your organization.
            </>
          )}
        </p>

        {currentCoords && (
          <div className="mt-4 p-3 rounded-lg bg-card border border-border text-xs text-left grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground block">GPS ACCURACY</span>
              <span className="font-bold text-foreground">±{Math.round(currentCoords.accuracy)} meters</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">LAST UPDATE</span>
              <span className="font-bold text-foreground">
                {lastSentTime ? formatPhilippineTime(lastSentTime.toISOString()) : 'Just now'}
              </span>
            </div>
            <div className="col-span-2 text-[10px] font-mono text-muted-foreground">
              Lat: {currentCoords.latitude.toFixed(5)}, Lng: {currentCoords.longitude.toFixed(5)}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-3">
          <Button
            variant={isSharing ? 'destructive' : 'gold'}
            size="lg"
            onClick={isSharing ? stopTracking : startTracking}
            className="w-full font-bold"
          >
            {isSharing ? 'Turn Off Location Sharing' : 'Turn On Location Sharing'}
          </Button>
        </div>
      </Card>

      {/* GPS Simulation test buttons for easy instant testing in iframe/preview */}
      <Card className="border-border bg-muted/20">
        <CardContent className="p-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            📍 Instant GPS Simulation (Verification Helper):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulatedPosition(17.6132, 121.7270, 6)}
              className="text-xs h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            >
              Set INSIDE Building
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulatedPosition(17.6160, 121.7310, 10)}
              className="text-xs h-8 border-rose-500/40 text-rose-700 dark:text-rose-300"
            >
              Set OUTSIDE (Exit)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map Preview */}
      <Card className="border-border shadow-xs overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Live Map View</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/map')}
            className="h-7 text-xs text-amber-600 dark:text-amber-400 gap-1"
          >
            Full Map <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        <LeafletMap
          building={building}
          employees={employeeMarker}
          height="280px"
        />
      </Card>
    </div>
  );
};
