import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import type { List } from '@/types';

interface ListColumnProps {
  list: List;
  onAddTask: (listId: string, title: string) => void;
}

const ListColumn = ({ list, onAddTask }: ListColumnProps) => {
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
    <div className="flex-shrink-0 w-72 md:w-80">
      <div className="bg-muted/50 hover:bg-muted/60 transition-colors rounded-2xl p-3 flex flex-col max-h-[calc(100vh-10rem)] border border-border/20 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold text-sm text-foreground">{list.title}</h3>
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
            {list.tasks.length}
          </span>
        </div>

        <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-2 min-h-[2rem]">
          <SortableContext items={list.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {list.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
        </div>

        {isAdding ? (
          <div className="mt-2 space-y-2">
            <Input
              autoFocus
              placeholder="Task title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
              className="rounded-lg text-sm"
            />
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={handleAdd} className="rounded-lg text-xs">Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}><X className="h-3 w-3" /></Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="mt-2 w-full justify-start text-muted-foreground rounded-lg hover:text-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add a card
          </Button>
        )}
      </div>
    </div>
  );
};

export default ListColumn;
