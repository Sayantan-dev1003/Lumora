import { io, Socket } from 'socket.io-client';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = VITE_API_URL.replace(/\/api$/, '');

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ['polling','websocket']
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onMemberAdded = (callback: (data: { boardId: string, member: any }) => void) => {
  socket.on('member_added', callback);
};

export const joinBoard = (boardId: string) => {
  if (!socket) connectSocket();
  socket?.emit('join_board', { boardId });
};

export const leaveBoard = (boardId: string) => {
  socket?.emit('leave_board', { boardId });
};

// Event Listeners
export const onTaskCreated = (cb: (task: any) => void) => connectSocket().on('task_created', cb);
export const onTaskUpdated = (cb: (task: any) => void) => connectSocket().on('task_updated', cb);
export const onTaskDeleted = (cb: (data: { taskId: string }) => void) => connectSocket().on('task_deleted', cb);

export const onListCreated = (cb: (list: any) => void) => connectSocket().on('list_created', cb);
export const onListUpdated = (cb: (list: any) => void) => connectSocket().on('list_updated', cb);
export const onListDeleted = (cb: (data: { listId: string }) => void) => connectSocket().on('list_deleted', cb);

export const onActivityCreated = (cb: (activity: any) => void) => connectSocket().on('activity_created', cb);

export const getSocket = () => socket;
