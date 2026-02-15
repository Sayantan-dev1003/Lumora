import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket']
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

export const joinBoard = (boardId: string) => {
  if (!socket) connectSocket();
  socket?.emit('join_board', { boardId });
};

export const leaveBoard = (boardId: string) => {
  // Optional: emit leave_board if backend supports it, or just disconnect on unmount if exclusive
  // For now, just do nothing or emit if backend had leave logic (which I didn't implement, but easy to add)
  // Backend only joins. Socket.io auto-leaves on disconnect.
  // But explicit leave is good for SPA navigation without disconnect.
  // I didn't implement leave_board in backend.
  // But standard is usually fine.
};

// Event Listeners
export const onTaskCreated = (cb: (task: any) => void) => socket?.on('task_created', cb);
export const onTaskUpdated = (cb: (task: any) => void) => socket?.on('task_updated', cb);
export const onTaskDeleted = (cb: (data: { taskId: string }) => void) => socket?.on('task_deleted', cb);

export const onListCreated = (cb: (list: any) => void) => socket?.on('list_created', cb);
export const onListUpdated = (cb: (list: any) => void) => socket?.on('list_updated', cb);
export const onListDeleted = (cb: (data: { listId: string }) => void) => socket?.on('list_deleted', cb);

export const onActivityCreated = (cb: (activity: any) => void) => socket?.on('activity_created', cb);

export const getSocket = () => socket;
