import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '@/store/boardStore';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
}

const TaskCard = ({ task }: TaskCardProps) => {
  const openTaskModal = useBoardStore((s) => s.openTaskModal);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-xl cursor-pointer bg-card hover:shadow-float hover:-translate-y-0.5 transition-all duration-300 border-border/30 group"
      onClick={() => openTaskModal(task)}
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
