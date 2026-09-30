import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { Ping, User } from '../types';
import { playUrgentPingSound, playMessageBeep, triggerDeviceVibration } from '../lib/audio';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: number[];
  urgentPing: Ping | null;
  clearUrgentPing: () => void;
  liveEmployees: User[];
  setLiveEmployees: React.Dispatch<React.SetStateAction<User[]>>;
  sendLocation: (lat: number, lng: number, accuracy: number, isUnavailable?: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, setPendingPings, setUnreadMessagesCount } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const [urgentPing, setUrgentPing] = useState<Ping | null>(null);
  const [liveEmployees, setLiveEmployees] = useState<User[]>([]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io({
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('auth:register', { token });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('presence:update', (data: { onlineUserIds: number[] }) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    newSocket.on('location:changed', (data: any) => {
      setLiveEmployees((prev) => {
        const index = prev.findIndex((e) => e.id === data.userId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            location_status: data.status,
            last_location_update: data.recordedAt,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: data.userId,
              employee_id: data.employeeId,
              name: data.name,
              email: '',
              role: 'EMPLOYEE',
              department: data.department,
              position: 'Staff',
              avatar: null,
              is_active: 1,
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: data.accuracy,
              location_status: data.status,
              last_location_update: data.recordedAt,
            },
          ];
        }
      });
    });

    newSocket.on('chat:new_message_notification', () => {
      setUnreadMessagesCount((c) => c + 1);
      playMessageBeep();
    });

    // Urgent Ping received by employee
    newSocket.on('ping:urgent_received', (ping: Ping) => {
      setUrgentPing(ping);
      setPendingPings((prev) => [ping, ...prev.filter((p) => p.id !== ping.id)]);
      playUrgentPingSound();
      triggerDeviceVibration();

      // Attempt browser notification if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🚨 URGENT PING FROM MANAGEMENT', {
            body: ping.message || 'Administrator is requesting your immediate acknowledgement.',
            icon: '/icon.svg',
            requireInteraction: true,
          });
        } catch (e) {
          // notification fallback
        }
      }
    });

    newSocket.on('ping:acknowledged', (updatedPing: Ping) => {
      setUrgentPing((curr) => (curr?.id === updatedPing.id ? null : curr));
      setPendingPings((prev) =>
        prev.map((p) => (p.id === updatedPing.id ? updatedPing : p))
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  const clearUrgentPing = () => {
    setUrgentPing(null);
  };

  const sendLocation = (latitude: number, longitude: number, accuracy: number, isUnavailable: boolean = false) => {
    if (socket && isConnected) {
      socket.emit('location:update', { latitude, longitude, accuracy, isUnavailable });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        urgentPing,
        clearUrgentPing,
        liveEmployees,
        setLiveEmployees,
        sendLocation,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
