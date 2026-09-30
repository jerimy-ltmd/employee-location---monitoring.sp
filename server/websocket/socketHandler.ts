import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../services/authService.ts';
import { processLocationUpdate } from '../services/locationService.ts';
import { sendMessage } from '../services/chatService.ts';
import { createUrgentPing, acknowledgePing } from '../services/pingService.ts';

// Map of userId -> Set of socket IDs (user might have multiple browser tabs)
const userSockets = new Map<number, Set<string>>();
// Map of socketId -> userId
const socketUser = new Map<string, number>();

export function setupWebSocket(io: SocketIOServer) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Allow unauthenticated connection initially, can authenticate via event
      return next();
    }
    try {
      const user = verifyToken(token as string);
      (socket as any).user = user;
      next();
    } catch (err) {
      // Proceed as guest/unauthed socket
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    let currentUser = (socket as any).user;

    const registerUser = (user: any) => {
      currentUser = user;
      (socket as any).user = user;
      const uId = user.id;

      if (!userSockets.has(uId)) {
        userSockets.set(uId, new Set());
      }
      userSockets.get(uId)!.add(socket.id);
      socketUser.set(socket.id, uId);

      // Join individual user room
      socket.join(`user:${uId}`);
      if (user.role === 'ADMINISTRATOR') {
        socket.join('admins');
      }

      // Broadcast presence update
      io.emit('presence:update', {
        onlineUserIds: Array.from(userSockets.keys()),
        userId: uId,
        status: 'online',
      });
    };

    if (currentUser) {
      registerUser(currentUser);
    }

    socket.on('auth:register', (data: { token: string }) => {
      try {
        const decoded = verifyToken(data.token);
        registerUser(decoded);
        socket.emit('auth:success', { user: decoded });
      } catch (err) {
        socket.emit('auth:error', { message: 'Invalid token' });
      }
    });

    // Employee sends real-time location update
    socket.on('location:update', async (data: { latitude: number; longitude: number; accuracy: number; isUnavailable?: boolean }) => {
      if (!currentUser) return;
      try {
        const result = await processLocationUpdate(
          currentUser.id,
          data.latitude,
          data.longitude,
          data.accuracy,
          data.isUnavailable || false
        );

        // Broadcast to admins and public update
        const payload = {
          userId: currentUser.id,
          employeeId: currentUser.employee_id,
          name: currentUser.name,
          department: currentUser.department,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          status: result.status,
          distanceMeters: result.distanceMeters,
          eventCreated: result.eventCreated,
          recordedAt: new Date().toISOString(),
        };

        io.emit('location:changed', payload);

        // Echo back to sender
        socket.emit('location:ack', result);
      } catch (err: any) {
        console.error('Error processing location update:', err);
        socket.emit('location:error', { message: err.message });
      }
    });

    // Chat room join
    socket.on('chat:join', (data: { conversationId: number }) => {
      socket.join(`convo:${data.conversationId}`);
    });

    // Real-time chat message
    socket.on('chat:send', async (data: { conversationId: number; message: string }) => {
      if (!currentUser) return;
      try {
        const { message, recipientIds } = await sendMessage(
          data.conversationId,
          currentUser.id,
          data.message
        );

        // Emit to conversation room
        io.to(`convo:${data.conversationId}`).emit('chat:message', message);

        // Notify specific recipients outside room
        for (const rId of recipientIds) {
          io.to(`user:${rId}`).emit('chat:new_message_notification', {
            conversationId: data.conversationId,
            message,
          });
        }
      } catch (err: any) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    // Typing indicator
    socket.on('chat:typing', (data: { conversationId: number; isTyping: boolean }) => {
      if (!currentUser) return;
      socket.to(`convo:${data.conversationId}`).emit('chat:user_typing', {
        conversationId: data.conversationId,
        userId: currentUser.id,
        userName: currentUser.name,
        isTyping: data.isTyping,
      });
    });

    // Admin sends Urgent Ping
    socket.on('ping:send', async (data: { recipientId: number; message?: string }) => {
      if (!currentUser) return;
      try {
        const ping = await createUrgentPing(currentUser.id, data.recipientId, data.message);

        // Send high-priority alert to recipient
        io.to(`user:${data.recipientId}`).emit('ping:urgent_received', ping);

        // Broadcast to admins that ping was sent
        io.to('admins').emit('ping:status_updated', ping);
        socket.emit('ping:sent_success', ping);
      } catch (err: any) {
        socket.emit('ping:error', { message: err.message });
      }
    });

    // Employee acknowledges Urgent Ping
    socket.on('ping:acknowledge', async (data: { pingId: number }) => {
      if (!currentUser) return;
      try {
        const updatedPing = await acknowledgePing(data.pingId, currentUser.id);

        // Notify all admins and sender
        io.emit('ping:acknowledged', updatedPing);
        socket.emit('ping:ack_success', updatedPing);
      } catch (err: any) {
        socket.emit('ping:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (currentUser) {
        const uId = currentUser.id;
        const set = userSockets.get(uId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            userSockets.delete(uId);
            io.emit('presence:update', {
              onlineUserIds: Array.from(userSockets.keys()),
              userId: uId,
              status: 'offline',
            });
          }
        }
      }
      socketUser.delete(socket.id);
    });
  });
}
