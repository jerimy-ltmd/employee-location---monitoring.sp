import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { User, Building } from '../../types';
import { formatPhilippineTime } from '../../lib/utils';

interface LeafletMapProps {
  building: Building | null;
  employees: User[];
  selectedEmployeeId?: number | null;
  onSelectEmployee?: (emp: User) => void;
  onPingEmployee?: (emp: User) => void;
  onChatEmployee?: (emp: User) => void;
  onViewHistory?: (emp: User) => void;
  height?: string;
  isEditable?: boolean;
  onGeofenceChange?: (lat: number, lng: number) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  building,
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  onPingEmployee,
  onChatEmployee,
  onViewHistory,
  height = '500px',
  isEditable = false,
  onGeofenceChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const buildingMarkerRef = useRef<L.Marker | null>(null);
  const buildingCircleRef = useRef<L.Circle | null>(null);
  const employeeMarkersRef = useRef<Map<number, L.Marker>>(new Map());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = building?.latitude || 17.6132;
    const initialLng = building?.longitude || 121.7270;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 17,
      zoomControl: true,
    });

    // OpenStreetMap Tile Layer (Free, reliable, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Handle map click for editable geofence mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isEditable && onGeofenceChange) {
        onGeofenceChange(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Building and Geofence Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !building) return;

    const bPos: L.LatLngExpression = [building.latitude, building.longitude];

    // Building Icon
    const buildingHtml = `
      <div class="flex items-center justify-center h-10 w-10 rounded-full bg-[#091D3C] text-amber-400 border-2 border-amber-400 shadow-xl" style="transform: translate(-50%, -50%);">
        <span style="font-size: 20px;">🏢</span>
      </div>
    `;

    const buildingIcon = L.divIcon({
      html: buildingHtml,
      className: 'building-custom-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (buildingMarkerRef.current) {
      buildingMarkerRef.current.setLatLng(bPos);
    } else {
      buildingMarkerRef.current = L.marker(bPos, {
        icon: buildingIcon,
        draggable: isEditable,
      }).addTo(map);

      buildingMarkerRef.current.bindPopup(`
        <div style="font-family: inherit; min-width: 180px; padding: 4px;">
          <div style="font-weight: bold; font-size: 13px; color: #091D3C;">🏢 ${building.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Geofence Perimeter: <strong>${building.radius_meters}m</strong><br/>
            GPS Accuracy Limit: ±${building.accuracy_threshold}m
          </div>
        </div>
      `);

      if (isEditable) {
        buildingMarkerRef.current.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          onGeofenceChange?.(pos.lat, pos.lng);
        });
      }
    }

    // Geofence Circle
    if (buildingCircleRef.current) {
      buildingCircleRef.current.setLatLng(bPos);
      buildingCircleRef.current.setRadius(building.radius_meters);
    } else {
      buildingCircleRef.current = L.circle(bPos, {
        radius: building.radius_meters,
        color: '#E0B12C',
        fillColor: '#E0B12C',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);
    }
  }, [building, isEditable]);

  // Update Employee Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = employeeMarkersRef.current;
    const activeIds = new Set<number>();

    employees.forEach((emp) => {
      activeIds.add(emp.id);

      if (emp.latitude === null || emp.latitude === undefined || emp.longitude === null || emp.longitude === undefined) {
        // Remove marker if location unavailable
        if (currentMarkers.has(emp.id)) {
          currentMarkers.get(emp.id)!.remove();
          currentMarkers.delete(emp.id);
        }
        return;
      }

      const empPos: L.LatLngExpression = [emp.latitude, emp.longitude];
      const isInside = emp.location_status === 'INSIDE';
      const isOutside = emp.location_status === 'OUTSIDE';
      const isUncertain = emp.location_status === 'LOCATION_UNCERTAIN';

      let bgClass = '#64748b'; // default offline
      let ringColor = 'rgba(100, 116, 139, 0.4)';
      let statusLabel = '⚪ UNAVAILABLE';

      if (isInside) {
        bgClass = '#10b981'; // emerald green
        ringColor = 'rgba(16, 185, 129, 0.5)';
        statusLabel = '🟢 INSIDE BUILDING';
      } else if (isOutside) {
        bgClass = '#ef4444'; // rose red
        ringColor = 'rgba(239, 68, 68, 0.5)';
        statusLabel = '🔴 OUTSIDE BUILDING';
      } else if (isUncertain) {
        bgClass = '#f59e0b'; // amber
        ringColor = 'rgba(245, 158, 11, 0.5)';
        statusLabel = '🟡 LOCATION UNCERTAIN';
      }

      const initials = emp.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const html = `
        <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -50%); cursor: pointer;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${ringColor}; animation: pulse 2s infinite;"></div>
          <div style="position: relative; width: 36px; height: 36px; border-radius: 9999px; background: ${bgClass}; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px;">
            ${initials}
          </div>
        </div>
      `;

      const empIcon = L.divIcon({
        html,
        className: 'employee-custom-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      let marker = currentMarkers.get(emp.id);
      if (marker) {
        marker.setLatLng(empPos);
        marker.setIcon(empIcon);
      } else {
        marker = L.marker(empPos, { icon: empIcon }).addTo(map);
        currentMarkers.set(emp.id, marker);
      }

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      popupContent.style.minWidth = '220px';
      popupContent.style.padding = '4px';

      popupContent.innerHTML = `
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="font-weight: 700; font-size: 14px; color: #091D3C;">${emp.name}</div>
          <div style="font-size: 11px; color: #64748b;">${emp.position} &bull; ${emp.department}</div>
        </div>
        <div style="font-size: 12px; margin-bottom: 8px;">
          <div>Status: <strong>${statusLabel}</strong></div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Updated: ${formatPhilippineTime(emp.last_location_update)}<br/>
            Accuracy: ±${Math.round(emp.accuracy || 0)} meters
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px;">
          <button id="pop-chat-${emp.id}" style="background: #091D3C; color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
            💬 CHAT
          </button>
          <button id="pop-ping-${emp.id}" style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
            🔔 PING
          </button>
        </div>
        <div style="margin-top: 6px;">
          <button id="pop-hist-${emp.id}" style="width: 100%; background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; font-size: 11px; font-weight: 500; cursor: pointer;">
            📍 VIEW LOCATION HISTORY
          </button>
        </div>
      `;

      // Wire popup click listeners
      popupContent.querySelector(`#pop-chat-${emp.id}`)?.addEventListener('click', () => {
        onChatEmployee?.(emp);
      });
      popupContent.querySelector(`#pop-ping-${emp.id}`)?.addEventListener('click', () => {
        onPingEmployee?.(emp);
      });
      popupContent.querySelector(`#pop-hist-${emp.id}`)?.addEventListener('click', () => {
        onViewHistory?.(emp);
      });

      marker.bindPopup(popupContent);
    });

    // Cleanup stale markers
    currentMarkers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });
  }, [employees]);

  // Center on selected employee if specified
  useEffect(() => {
    if (!selectedEmployeeId || !mapInstanceRef.current) return;
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (emp && emp.latitude && emp.longitude) {
      mapInstanceRef.current.flyTo([emp.latitude, emp.longitude], 18, {
        duration: 1.2,
      });
      const marker = employeeMarkersRef.current.get(emp.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedEmployeeId]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border shadow-xs bg-muted/20">
      <div ref={mapContainerRef} style={{ height }} className="z-10" />

      {/* Floating Map Legend */}
      <div className="absolute top-3 right-3 z-20 rounded-lg border border-border bg-card/90 p-2.5 shadow-md backdrop-blur-xs text-[11px]">
        <p className="font-bold text-foreground mb-1.5 uppercase tracking-wider text-[10px]">
          Perimeter Status
        </p>
        <div className="space-y-1 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-foreground font-medium">Inside Perimeter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-foreground font-medium">Outside Perimeter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-foreground font-medium">Location Uncertain</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span>Unavailable / Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
