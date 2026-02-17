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

export const updateProfile = async (data: { name?: string; email?: string }): Promise<{ user: User }> => {
  const { data: res } = await api.patch('/auth/me', data);
  return res.data;
};

export const changePassword = async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
  await api.post('/auth/change-password', data);
};


export const fetchMeApi = async (): Promise<{ user: User }> => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const searchUsersApi = async (query: string): Promise<User[]> => {
  const { data } = await api.get(`/auth/users?q=${query}`);
  return data.users;
};


// --- Boards ---
export const fetchBoards = async (page = 1, limit = 10, type?: 'created' | 'member' | 'all'): Promise<{ boards: BoardSummary[], total: number }> => {
  const p = typeof page === 'number' ? page : 1;
  const l = typeof limit === 'number' ? limit : 10;
  const t = type ? `&type=${type}` : '';
  const { data } = await api.get(`/boards?page=${p}&limit=${l}${t}`);
  return {
    boards: data.data,
    total: data.pagination?.total || 0,
  };
};

export const fetchBoard = async (boardId: string): Promise<Board> => {
  const { data } = await api.get(`/boards/${boardId}`);
  return data.data;
};

export const createBoard = async (title: string): Promise<BoardSummary> => {
  const { data } = await api.post('/boards', { title });
  return data.data;
};

export const deleteBoard = async (boardId: string): Promise<void> => {
  await api.delete(`/boards/${boardId}`);
};

// --- Tasks ---
export const createTask = async (listId: string, title: string): Promise<Task> => {
  const { data } = await api.post('/tasks', { listId, title });
  return data.data;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  const { data } = await api.patch(`/tasks/${taskId}`, updates);
  return data.data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}`);
};

export const moveTaskApi = async (taskId: string, payload: { sourceListId: string, destinationListId: string, sourceIndex: number, destinationIndex: number }): Promise<void> => {
  await api.patch(`/tasks/${taskId}/move`, payload);
};

export const searchTasks = async (query: string, boardId?: string, filter?: 'assigned' | 'created' | 'all'): Promise<Task[]> => {
  let url = `/tasks?search=${query}`;
  if (boardId) url += `&boardId=${boardId}`;
  if (filter) url += `&filter=${filter}`;
  const { data } = await api.get(url);
  return data.data;
};

// --- Lists ---
export const createList = async (boardId: string, title: string) => {
  const { data } = await api.post('/lists', { boardId, title });
  return data.data;
};

export const updateList = async (listId: string, updates: any) => {
  const { data } = await api.patch(`/lists/${listId}`, updates);
  return data.data;
};

export const deleteList = async (listId: string) => {
  await api.delete(`/lists/${listId}`);
};

// --- Activity ---
export const fetchBoardActivity = async (boardId: string) => {
  const { data } = await api.get(`/boards/${boardId}/activity`);
  return data.data;
};

export const fetchGlobalActivity = async (page = 1, limit = 20, filter: 'all' | 'mine' = 'all') => {
  const { data } = await api.get(`/activity?page=${page}&limit=${limit}&filter=${filter}`);
  return data;
};

// --- Dashboard ---
export const fetchDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data.data;
};

export default api;
