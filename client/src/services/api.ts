import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import type { Board, BoardSummary, Task, User } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // We use cookie-based auth, but keeping the token logic if user chooses to use it in other parts
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// --- Auth ---
export const loginApi = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const signupApi = async (name: string, email: string, password: string): Promise<{ user: User; token: string }> => {
  const { data } = await api.post('/auth/signup', { name, email, password });
  return data;
};

export const logoutApi = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export const fetchMeApi = async (): Promise<{ user: User }> => {
  const { data } = await api.get('/auth/me');
  return data;
};

// --- Boards ---
export const fetchBoards = async (page = 1, limit = 10): Promise<{ boards: BoardSummary[], total: number }> => {
  const { data } = await api.get(`/boards?page=${page}&limit=${limit}`);
  return data;
};

export const fetchBoard = async (boardId: string): Promise<Board> => {
  const { data } = await api.get(`/boards/${boardId}`);
  return data;
};

export const createBoard = async (title: string): Promise<BoardSummary> => {
  const { data } = await api.post('/boards', { title });
  return data;
};

export const deleteBoard = async (boardId: string): Promise<void> => {
  await api.delete(`/boards/${boardId}`);
};

// --- Tasks ---
export const createTask = async (listId: string, title: string): Promise<Task> => {
  const { data } = await api.post('/tasks', { listId, title });
  return data;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  const { data } = await api.patch(`/tasks/${taskId}`, updates);
  return data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}`);
};

export const searchTasks = async (query: string): Promise<Task[]> => {
  const { data } = await api.get(`/tasks?search=${query}`);
  return data;
};

// --- Lists ---
export const createList = async (boardId: string, title: string) => {
  const { data } = await api.post('/lists', { boardId, title });
  return data;
};

export const updateList = async (listId: string, updates: any) => {
  const { data } = await api.patch(`/lists/${listId}`, updates);
  return data;
};

export const deleteList = async (listId: string) => {
  await api.delete(`/lists/${listId}`);
};

// --- Activity ---
export const fetchActivity = async (boardId: string) => {
  const { data } = await api.get(`/boards/${boardId}/activity`);
  return data;
};

export default api;
