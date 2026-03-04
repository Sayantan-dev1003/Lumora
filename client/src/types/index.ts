export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  listId: string;
  position: number;
  assignedUserId?: string | null;
  assignedUser?: User | null;
  creatorId: string;
  creator?: User;
  createdAt: string;
  updatedAt: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
}

export interface List {
  id: string;
  title: string;
  boardId: string;
  position: number;
  tasks: Task[];
  creatorId?: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: string;
  user: User;
}

export interface Board {
  id: string;
  title: string;
  ownerId?: string;
  owner?: User;
  members: BoardMember[];
  lists: List[];
  createdAt: string;
  isCompleted?: boolean;
}

export interface BoardSummary {
  id: string;
  title: string;
  memberCount: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  boardId: string;
  userId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  board?: {
    title: string;
  };
}

export interface DashboardStats {
  totalBoards: number;
  totalTasks: number;
  assignedToMe: number;
  activeTasks: number;
}
