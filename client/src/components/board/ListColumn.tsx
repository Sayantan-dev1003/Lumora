import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Trash2 } from 'lucide-react';
import type { List, User } from '@/types';

interface ListColumnProps {
  list: List;
  onAddTask: (listId: string, title: string) => void;
  onDeleteList?: (listId: string) => void;
  userRole?: string;
  currentUser?: User | null;
  boardOwnerId?: string;
}

const ListColumn = ({ list, onAddTask, onDeleteList, userRole = 'member', currentUser, boardOwnerId }: ListColumnProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const { setNodeRef } = useDroppable({ id: list.id });

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAddTask(list.id, newTitle.trim());
      setNewTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-muted/30 hover:bg-muted/40 transition-colors duration-300 rounded-2xl p-4 flex flex-col max-h-[calc(100vh-10rem)] border border-white/5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 px-1 group">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-foreground tracking-tight">{list.title}</h3>
            {(list.creatorId === currentUser?.id || boardOwnerId === currentUser?.id) && onDeleteList && (
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive" onClick={() => onDeleteList(list.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-background/50 px-2.5 py-1 rounded-full border border-border/10">
            {list.tasks.length}
          </span>
        </div>

        <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-3 min-h-[2rem] pr-1 -mr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <SortableContext items={list.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {list.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
        </div>

        {userRole === 'admin' && (
          isAdding ? (
            <div className="mt-4 space-y-3 bg-background/40 p-2 rounded-xl border border-border/10 animate-in fade-in slide-in-from-top-2 duration-200">
              <Input
                autoFocus
                placeholder="Enter task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
                className="rounded-lg text-sm bg-background/60 border-transparent focus:border-primary/20 shadow-none"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleAdd} className="rounded-lg text-xs h-8 px-4">Add Card</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 w-8 p-0 rounded-lg hover:bg-background/50"><X className="h-4 w-4" /></Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="mt-4 w-full justify-start text-muted-foreground hover:text-primary hover:bg-background/40 h-10 rounded-xl transition-all duration-200 group"
            >
              <Plus className="h-4 w-4 mr-2 group-hover:bg-primary/10 rounded-full p-0.5 box-content transition-colors" />
              <span className="font-medium">Add a task</span>
            </Button>
          )
        )}
      </div>
    </div>
  );
};

export default ListColumn;
