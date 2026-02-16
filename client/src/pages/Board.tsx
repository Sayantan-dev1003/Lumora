import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { fetchBoard, createList, createTask, updateTask, deleteTask } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { joinBoard, leaveBoard, onTaskCreated, onTaskUpdated, onTaskDeleted, onListCreated, onListUpdated, onListDeleted, onActivityCreated, getSocket } from '@/services/socket';
import { toast } from 'sonner';
import BoardHeader from '@/components/board/BoardHeader';
import ListColumn from '@/components/board/ListColumn';
import TaskModal from '@/components/modals/TaskModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import type { List, Task } from '@/types';

const Board = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [lists, setLists] = useState<List[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId!),
    enabled: !!boardId,
  });

  const currentUser = useAuthStore((s) => s.user);
  const allMembers = board?.members.map((m: any) => m.user) || [];

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
    setActiveTask(null);

    const activeId = active.id as string;
    const overId = over?.id as string;

    if (!overId) return;

    const activeList = lists.find((l) => l.tasks.some((t) => t.id === activeId));
    const overList = lists.find((l) => l.id === overId || l.tasks.some((t) => t.id === overId));

    if (!activeList || !overList) return;

    if (activeList.id === overList.id) {
      const oldIndex = activeList.tasks.findIndex((t) => t.id === activeId);
      const newIndex = overList.tasks.findIndex((t) => t.id === overId);

      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        setLists((prev) =>
          prev.map((l) =>
            l.id === activeList.id ? { ...l, tasks: arrayMove(l.tasks, oldIndex, newIndex) } : l
          )
        );

        try {
          // Always send listId in case it was a move between lists (handled by DragOver)
          await updateTask(activeId, { position: newIndex + 1, listId: overList.id });
        } catch (error) {
          toast.error('Failed to reorder task');
        }
      }
    } else {
      // Moved between lists (state already updated in handleDragOver)
      // This block might not be reached if handleDragOver updates the state such that activeList === overList
      // But if it IS reached (e.g. DragOver didn't run or update yet?), we keep it.
      const newIndex = overList.tasks.findIndex((t) => t.id === activeId);
      const finalPosition = (newIndex >= 0 ? newIndex : overList.tasks.length) + 1;

      try {
        await updateTask(activeId, {
          listId: overList.id,
          position: finalPosition,
        });
      } catch (error) {
        toast.error('Failed to move task');
      }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BoardHeader title={board?.title || 'Board'} members={allMembers} />

      <div className="flex-1 overflow-x-auto p-4 md:p-6">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 items-start min-w-max">
            {lists.map((list) => (
              <ListColumn key={list.id} list={list} onAddTask={handleAddTask} />
            ))}

            {/* Add list */}
            {addingList ? (
              <div className="flex-shrink-0 w-72 md:w-80 bg-muted/60 rounded-xl p-3 space-y-2">
                <Input
                  autoFocus
                  placeholder="List title..."
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false); }}
                  className="rounded-lg"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleAddList} className="rounded-lg">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingList(false)}><X className="h-3 w-3" /></Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setAddingList(true)} className="flex-shrink-0 w-72 md:w-80 rounded-xl justify-start text-muted-foreground border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Add another list
              </Button>
            )}
          </div>

          <DragOverlay>
            {activeTask && (
              <Card className="p-3 rounded-lg bg-background shadow-lg border-accent rotate-2 w-72">
                <p className="text-sm font-medium">{activeTask.title}</p>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal members={allMembers.filter(m => m.id !== currentUser?.id)} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
    </div>
  );
};

export default Board;
