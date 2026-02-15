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
  assigneeId?: string;
  assignee?: User;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  title: string;
  boardId: string;
  position: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  title: string;
  members: User[];
  lists: List[];
  createdAt: string;
}

export interface BoardSummary {
  id: string;
  title: string;
  memberCount: number;
  createdAt: string;
}
