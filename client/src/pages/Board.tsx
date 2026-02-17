import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { fetchBoard, createList, createTask, updateTask, moveTaskApi, deleteTask } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { joinBoard, leaveBoard, onTaskCreated, onTaskUpdated, onTaskDeleted, onListCreated, onListUpdated, onListDeleted, onActivityCreated, getSocket, onMemberAdded } from '@/services/socket';
import { toast } from 'sonner';
import BoardHeader from '@/components/board/BoardHeader';
import ListColumn from '@/components/board/ListColumn';
import TaskModal from '@/components/modals/TaskModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import type { List, Task, BoardMember, Board as BoardType } from '@/types';

const Board = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [lists, setLists] = useState<List[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId!),
    enabled: !!boardId,
  });

  const currentUser = useAuthStore((s) => s.user);
  const allMembers = board?.members.map((m: BoardMember) => m.user) || [];

  useEffect(() => {
    if (board) setLists(board.lists);
  }, [board]);

  useEffect(() => {
    if (boardId) {
      joinBoard(boardId);

      const handleTaskCreated = (newTask: Task) => {
        setLists(prev => prev.map(list =>
          list.id === newTask.listId
            ? { ...list, tasks: [...list.tasks, newTask] }
            : list
        ));
        toast.success(`Task "${newTask.title}" created`);
      };

      const handleTaskUpdated = (updatedTask: Task) => {
        setLists(prev => {
          const taskExists = prev.some(l => l.tasks.some(t => t.id === updatedTask.id));
          if (!taskExists) return prev;

          const listsWithoutTask = prev.map(l => ({
            ...l,
            tasks: l.tasks.filter(t => t.id !== updatedTask.id)
          }));

          return listsWithoutTask.map(l =>
            l.id === updatedTask.listId
              ? {
                ...l,
                tasks: [...l.tasks, updatedTask].sort((a, b) => a.position - b.position)
              }
              : l
          );
        });
      };

      const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
        setLists(prev => prev.map(l => ({
          ...l,
          tasks: l.tasks.filter(t => t.id !== taskId)
        })));
        toast.info("Task deleted");
      };

      const handleListCreated = (newList: List) => {
        setLists(prev => {
          if (prev.find(l => l.id === newList.id)) return prev;
          return [...prev, { ...newList, tasks: [] }];
        });
        toast.success(`List "${newList.title}" created`);
      };

      const handleListUpdated = (updatedList: List) => {
        setLists(prev => prev.map(l => l.id === updatedList.id ? { ...l, ...updatedList } : l));
      };

      const handleListDeleted = ({ listId }: { listId: string }) => {
        setLists(prev => prev.filter(l => l.id !== listId));
        toast.info("List deleted");
      };

      // Activity handler skipped for now as UI logic is separate
      const handleMemberAdded = ({ member }: { member: BoardMember }) => {
        queryClient.setQueryData(['board', boardId], (oldData: BoardType | undefined) => {
          if (!oldData) return oldData;
          // Check if already exists
          if (oldData.members.find((m: BoardMember) => m.user.id === member.user.id)) return oldData;
          return {
            ...oldData,
            members: [...oldData.members, member]
          };
        });
        toast.success(`${member.user.name} added to board`);
      };

      onTaskCreated(handleTaskCreated);
      onTaskUpdated(handleTaskUpdated);
      onTaskDeleted(handleTaskDeleted);
      onListCreated(handleListCreated);
      onListUpdated(handleListUpdated);
      onListDeleted(handleListDeleted);

      return () => {
        leaveBoard(boardId);
        const socket = getSocket();
        socket?.off('task_created', handleTaskCreated);
        socket?.off('task_updated', handleTaskUpdated);
        socket?.off('task_deleted', handleTaskDeleted);
        socket?.off('list_created', handleListCreated);
        socket?.off('list_updated', handleListUpdated);
        socket?.off('list_deleted', handleListDeleted);
        socket?.off('member_added', handleMemberAdded);
      };
    }
  }, [boardId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    for (const list of lists) {
      const task = list.tasks.find((t) => t.id === taskId);
      if (task) { setActiveTask(task); break; }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeList = lists.find((l) => l.tasks.some((t) => t.id === activeId));
    const overList = lists.find((l) => l.id === overId || l.tasks.some((t) => t.id === overId));

    if (!activeList || !overList || activeList.id === overList.id) return;

    setLists((prev) => {
      const task = activeList.tasks.find((t) => t.id === activeId)!;
      return prev.map((l) => {
        if (l.id === activeList.id) return { ...l, tasks: l.tasks.filter((t) => t.id !== activeId) };
        if (l.id === overList.id) {
          const overIndex = l.tasks.findIndex((t) => t.id === overId);
          const newTasks = [...l.tasks];
          newTasks.splice(overIndex >= 0 ? overIndex : newTasks.length, 0, { ...task, listId: l.id });
          return { ...l, tasks: newTasks };
        }
        return l;
      });
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const task = activeTask; // Snapshot from drag start
    setActiveTask(null);

    if (!over || !task) return;

    const activeId = active.id as string;

    // Find where the task ended up in the current state (modified by handleDragOver)
    const destList = lists.find(l => l.tasks.some(t => t.id === activeId));
    if (!destList) return;

    const destIndex = destList.tasks.findIndex(t => t.id === activeId);

    // Calculate source parameters from the snapshot
    const sourceListId = task.listId;
    const sourceIndex = task.position - 1;

    if (destList.id === sourceListId && destIndex === sourceIndex) {
      return; // No change
    }

    try {
      await moveTaskApi(activeId, {
        sourceListId,
        destinationListId: destList.id,
        sourceIndex,
        destinationIndex: destIndex
      });
    } catch (error) {
      toast.error("Failed to move task");
    }
  };

  const handleAddTask = useCallback(async (listId: string, title: string) => {
    try {
      await createTask(listId, title);
    } catch (error) {
      toast.error("Failed to create task");
    }
  }, []);

  const handleAddList = async () => {
    if (!newListTitle.trim() || !boardId) return;
    try {
      await createList(boardId, newListTitle.trim());
      setNewListTitle('');
      setAddingList(false);
    } catch (error) {
      toast.error("Failed to create list");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleUpdateTask = async (taskId: string, updates: { title?: string; description?: string; assignedUserId?: string }) => {
    try {
      await updateTask(taskId, updates);
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background border-l border-border/40 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 bg-muted rounded-xl animate-pulse" />
            <div className="h-7 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center -space-x-3">
            {[1, 2, 3].map(i => <div key={i} className="h-9 w-9 rounded-full border-2 border-background bg-muted animate-pulse" />)}
          </div>
        </div>
        <div className="flex-1 overflow-x-auto p-4 md:p-6 flex gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-80 bg-muted/30 rounded-2xl p-4 flex flex-col gap-4 h-[500px] border border-border/10">
              <div className="flex justify-between items-center">
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-5 w-8 bg-muted rounded-full animate-pulse" />
              </div>
              <div className="h-24 w-full bg-muted/50 rounded-xl animate-pulse" />
              <div className="h-24 w-full bg-muted/50 rounded-xl animate-pulse" />
              <div className="h-24 w-full bg-muted/50 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background border-l border-border/40 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <BoardHeader title={board?.title || 'Board'} members={allMembers} />

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 items-start min-w-max h-full">
            {lists.map((list) => (
              <ListColumn key={list.id} list={list} onAddTask={handleAddTask} />
            ))}

            {/* Add list - Only for admins */}
            {board?.members.find((m) => m.userId === currentUser?.id)?.role === 'admin' && (
              <div className="flex-shrink-0 w-80">
                {addingList ? (
                  <div className="bg-muted/30 rounded-2xl p-4 border border-border/10 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <Input
                      autoFocus
                      placeholder="Enter list title..."
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
                      className="rounded-xl bg-background/50 border-transparent focus:border-primary/30"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddList} className="rounded-lg">Add List</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingList(false)} className="rounded-lg hover:bg-background/50"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setAddingList(true)}
                    className="w-full h-14 rounded-2xl justify-start text-muted-foreground border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                  >
                    <Plus className="h-5 w-5 mr-3" />
                    <span className="text-base font-medium">Add another list</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeTask && (
              <Card className="p-3.5 rounded-xl bg-background/90 backdrop-blur-md shadow-2xl border-primary/20 rotate-2 scale-105 cursor-grabbing w-80 ring-1 ring-primary/10">
                <p className="text-sm font-medium">{activeTask.title}</p>
                {activeTask.description && <p className="text-xs text-muted-foreground mt-1 truncate">{activeTask.description}</p>}
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal
        members={allMembers}
        onDelete={handleDeleteTask}
        onUpdate={handleUpdateTask}
        userRole={board?.members.find((m: BoardMember) => m.userId === currentUser?.id)?.role || 'member'}
      />
    </div>
  );
};

export default Board;
