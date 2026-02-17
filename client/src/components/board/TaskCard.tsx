import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '@/store/boardStore';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import type { Task } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
}

const TaskCard = ({ task }: TaskCardProps) => {
  const openTaskModal = useBoardStore((s) => s.openTaskModal);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3.5 rounded-xl cursor-pointer bg-card hover:bg-card/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-border/40 group relative overflow-hidden"
      onClick={() => openTaskModal(task)}
    >
      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground/50 hover:text-foreground">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="mr-6">
          <p className="text-sm font-medium leading-normal text-card-foreground line-clamp-2">{task.title}</p>
        </div>

        {(task.description || task.assignedUser) && (
          <div className="flex items-center justify-between mt-1 min-h-[1.25rem]">
            {task.description ? (
              <p className="text-xs text-muted-foreground/70 truncate max-w-[80%]">
                {task.description}
              </p>
            ) : <div />}

            {task.assignedUser && (
              <Avatar className="h-5 w-5 border border-background">
                <AvatarImage src={task.assignedUser.avatar} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {getInitials(task.assignedUser.name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TaskCard;
