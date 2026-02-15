import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import type { Board, BoardSummary, Task, User } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Auth ---
export const loginApi = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  // Mock for frontend-only development
  return {
    user: { id: '1', name: 'Demo User', email },
    token: 'mock-jwt-token',
  };
  // const { data } = await api.post('/auth/login', { email, password });
  // return data;
};

export const signupApi = async (name: string, email: string, password: string): Promise<{ user: User; token: string }> => {
  return {
    user: { id: '1', name, email },
    token: 'mock-jwt-token',
  };
};

// --- Boards ---
export const fetchBoards = async (): Promise<BoardSummary[]> => {
  // Mock data
  return [
    { id: '1', title: 'Product Launch', memberCount: 4, createdAt: new Date().toISOString() },
    { id: '2', title: 'Sprint Planning', memberCount: 3, createdAt: new Date().toISOString() },
    { id: '3', title: 'Design System', memberCount: 2, createdAt: new Date().toISOString() },
  ];
};

export const fetchBoard = async (boardId: string): Promise<Board> => {
  return {
    id: boardId,
    title: boardId === '1' ? 'Product Launch' : boardId === '2' ? 'Sprint Planning' : 'Design System',
    members: [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
      { id: '3', name: 'Charlie', email: 'charlie@example.com' },
    ],
    lists: [
      {
        id: 'list-1', title: 'To Do', boardId, position: 0,
        tasks: [
          { id: 'task-1', title: 'Research competitors', listId: 'list-1', position: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), description: 'Analyze top 5 competitors' },
          { id: 'task-2', title: 'Define MVP scope', listId: 'list-1', position: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'task-3', title: 'Create wireframes', listId: 'list-1', position: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
      },
      {
        id: 'list-2', title: 'In Progress', boardId, position: 1,
        tasks: [
          { id: 'task-4', title: 'Build authentication', listId: 'list-2', position: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assigneeId: '1' },
          { id: 'task-5', title: 'Design landing page', listId: 'list-2', position: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assigneeId: '2' },
        ],
      },
      {
        id: 'list-3', title: 'Done', boardId, position: 2,
        tasks: [
          { id: 'task-6', title: 'Setup project repo', listId: 'list-3', position: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
  };
};

export const createBoard = async (title: string): Promise<BoardSummary> => {
  return { id: Date.now().toString(), title, memberCount: 1, createdAt: new Date().toISOString() };
};

// --- Tasks ---
export const createTask = async (listId: string, title: string): Promise<Task> => {
  return { id: Date.now().toString(), title, listId, position: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  return { id: taskId, title: '', listId: '', position: 0, createdAt: '', updatedAt: new Date().toISOString(), ...updates } as Task;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  // await api.delete(`/tasks/${taskId}`);
};

// --- Lists ---
export const createList = async (boardId: string, title: string) => {
  return { id: Date.now().toString(), title, boardId, position: 0, tasks: [] };
};

export default api;
