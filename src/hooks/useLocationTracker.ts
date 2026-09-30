import { useState, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { calculateDistance } from '../lib/utils';
import { LocationStatus } from '../types';

export function useLocationTracker() {
  const { sendLocation, isConnected } = useSocket();
  const [isSharing, setIsSharing] = useState<boolean>(() => {
    return localStorage.getItem('sm_location_sharing_active') === 'true';
  });
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const [status, setStatus] = useState<LocationStatus>('LOCATION_UNAVAILABLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastSendTimestampRef = useRef<number>(0);

  // Check initial permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
          result.onchange = () => {
            setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
          };
        })
        .catch(() => {});
    }
  }, []);

  const dispatchUpdate = (lat: number, lng: number, accuracy: number) => {
    setCurrentCoords({
      latitude: lat,
      longitude: lng,
      accuracy,
      timestamp: Date.now(),
    });

    const now = Date.now();
    // Check throttle: minimum 15 seconds OR significant movement >= 25 meters
    const timeDiff = now - lastSendTimestampRef.current;
    let shouldSend = false;

    if (!lastCoordsRef.current || timeDiff >= 30000) {
      shouldSend = true;
    } else {
      const movedDistance = calculateDistance(
        lastCoordsRef.current.lat,
        lastCoordsRef.current.lng,
        lat,
        lng
      );
      if (movedDistance >= 25) {
        shouldSend = true;
      }
    }

    if (shouldSend) {
      lastSendTimestampRef.current = now;
      lastCoordsRef.current = { lat, lng };
      setLastSentTime(new Date());

      // Send via socket to backend
      sendLocation(lat, lng, accuracy, false);

      // REST fallback in case socket reconnecting
      fetch('/api/locations/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, accuracy }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status) {
            setStatus(data.status);
          }
        })
        .catch(() => {});
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      setStatus('LOCATION_UNAVAILABLE');
      return;
    }

    setErrorMessage(null);
    setIsSharing(true);
    localStorage.setItem('sm_location_sharing_active', 'true');

    // First request immediate position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionState('granted');
        dispatchUpdate(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
      },
      (error) => {
        console.warn('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          setErrorMessage('Location permission was denied. Please allow location access in your browser settings.');
        } else {
          setErrorMessage('Unable to retrieve device GPS coordinates.');
        }
        setStatus('LOCATION_UNAVAILABLE');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    // Watch position
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setPermissionState('granted');
        dispatchUpdate(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
      },
      (error) => {
        console.warn('WatchPosition error:', error);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
    setStatus('LOCATION_UNAVAILABLE');
    localStorage.setItem('sm_location_sharing_active', 'false');

    // Notify backend that location is disabled
    sendLocation(0, 0, 0, true);
    fetch('/api/locations/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('sm_token')}`,
      },
      body: JSON.stringify({ latitude: 0, longitude: 0, accuracy: 0, isUnavailable: true }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (isSharing) {
      startTracking();
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Quick helper to simulate coordinate shift for testing inside vs outside easily
  const setSimulatedPosition = (lat: number, lng: number, accuracy: number = 8) => {
    setIsSharing(true);
    localStorage.setItem('sm_location_sharing_active', 'true');
    dispatchUpdate(lat, lng, accuracy);
  };

  return {
    isSharing,
    permissionState,
    currentCoords,
    status,
    errorMessage,
    lastSentTime,
    startTracking,
    stopTracking,
    setSimulatedPosition,
  };
}
