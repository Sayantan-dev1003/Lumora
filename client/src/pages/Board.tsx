import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { fetchBoard } from '@/services/api';
import { joinBoard, leaveBoard } from '@/services/socket';
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

  useEffect(() => {
    if (board) setLists(board.lists);
  }, [board]);

  useEffect(() => {
    if (boardId) {
      joinBoard(boardId);
      return () => leaveBoard(boardId);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setLists((prev) =>
      prev.map((list) => {
        const oldIdx = list.tasks.findIndex((t) => t.id === activeId);
        const newIdx = list.tasks.findIndex((t) => t.id === overId);
        if (oldIdx >= 0 && newIdx >= 0) {
          return { ...list, tasks: arrayMove(list.tasks, oldIdx, newIdx) };
        }
        return list;
      })
    );
    // API call placeholder: updateTaskPosition(activeId, newListId, newPosition)
  };

  const handleAddTask = useCallback((listId: string, title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`, title, listId, position: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setLists((prev) => prev.map((l) => l.id === listId ? { ...l, tasks: [...l.tasks, newTask] } : l));
  }, []);

  const handleAddList = () => {
    if (!newListTitle.trim() || !boardId) return;
    const newList: List = { id: `list-${Date.now()}`, title: newListTitle.trim(), boardId, position: lists.length, tasks: [] };
    setLists((prev) => [...prev, newList]);
    setNewListTitle('');
    setAddingList(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setLists((prev) => prev.map((l) => ({ ...l, tasks: l.tasks.filter((t) => t.id !== taskId) })));
  };

  const handleUpdateTask = (taskId: string, updates: { title?: string; description?: string; assigneeId?: string }) => {
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)),
      }))
    );
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
      <BoardHeader title={board?.title || 'Board'} members={board?.members || []} />

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

      <TaskModal members={board?.members || []} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
    </div>
  );
};

export default Board;
