import { Server, Socket } from 'socket.io';
import http from 'http';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/db';

let io: Server;

export const initSocket = (httpServer: http.Server) => {
  io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173', // Adjust based on frontend port
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: No cookie provided'));
      }

      const token = cookieHeader
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        return next(new Error('Authentication error: No token found'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.data.userId}`);

    socket.on('join_board', async (data: { boardId: string }) => {
      try {
        const { boardId } = data;
        const userId = socket.data.userId;

        if (!boardId) {
          return;
        }

        // Verify board membership
        const member = await prisma.boardMember.findFirst({
          where: {
            userId,
            boardId,
          },
        });

        if (member) {
          socket.join(boardId);
          console.log(`User ${userId} joined board ${boardId}`);
        } else {
          console.log(`User ${userId} attempted to join board ${boardId} without membership`);
        }
      } catch (error) {
        console.error('Error joining board:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
