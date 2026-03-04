import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '@/store/boardStore';
import { Card } from '@/components/ui/card';
import { GripVertical, CheckCircle2 } from 'lucide-react';
import type { Task } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
}

const TaskCard = ({ task }: TaskCardProps) => {
  const openTaskModal = useBoardStore((s) => s.openTaskModal);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: task.status === 'DONE'
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3.5 rounded-xl cursor-pointer bg-card transition-all duration-200 border-border/40 group relative overflow-hidden",
        task.status !== 'DONE' && "hover:bg-card/80 hover:shadow-md hover:-translate-y-0.5",
        task.status === 'DONE' && "border-green-500/50 bg-green-500/5"
      )}
      onClick={() => openTaskModal(task)}
    >
      {task.status !== 'DONE' && (
        <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground/50 hover:text-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="mr-6 flex items-start gap-2">
          {task.status === 'DONE' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
          <p className={cn("text-sm font-medium leading-normal text-card-foreground line-clamp-2", task.status === 'DONE' && "text-muted-foreground line-through")}>{task.title}</p>
        </div>

        {(task.description || task.assignedUser || (task.status !== 'TODO' && task.status !== 'DONE')) && (
          <div className="flex flex-col gap-1 mt-1">
            {task.description && (
              <p className="text-xs text-muted-foreground/70 truncate">
                {task.description}
              </p>
            )}

            <div className="flex items-end gap-2 mt-1.5">
              <div>
                {task.status !== 'TODO' && task.status !== 'DONE' && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-md text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {task.status.replace('_', ' ')}
                  </div>
                )}
              </div>

              {task.assignedUser && (
                <Avatar className="h-5 w-5 border border-background shrink-0">
                  <AvatarImage src={task.assignedUser.avatar} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {getInitials(task.assignedUser.name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TaskCard;
