import { create } from 'zustand';
import type { Task } from '@/types';

interface BoardState {
  selectedTask: Task | null;
  isTaskModalOpen: boolean;
  openTaskModal: (task: Task) => void;
  closeTaskModal: () => void;
}

export const useBoardStore = create<BoardState>()((set) => ({
  selectedTask: null,
  isTaskModalOpen: false,
  openTaskModal: (task) => set({ selectedTask: task, isTaskModalOpen: true }),
  closeTaskModal: () => set({ selectedTask: null, isTaskModalOpen: false }),
}));
