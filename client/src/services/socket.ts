import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket'] });
  }
  if (!socket.connected) socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const joinBoard = (boardId: string) => {
  socket?.emit('join_board', boardId);
};

export const leaveBoard = (boardId: string) => {
  socket?.emit('leave_board', boardId);
};

export const onTaskCreated = (cb: (task: unknown) => void) => socket?.on('task_created', cb);
export const onTaskUpdated = (cb: (task: unknown) => void) => socket?.on('task_updated', cb);
export const onTaskDeleted = (cb: (taskId: string) => void) => socket?.on('task_deleted', cb);
export const onListCreated = (cb: (list: unknown) => void) => socket?.on('list_created', cb);
export const onListDeleted = (cb: (listId: string) => void) => socket?.on('list_deleted', cb);

export const getSocket = () => socket;
