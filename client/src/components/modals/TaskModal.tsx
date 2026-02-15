import { useState } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, MessageSquare } from 'lucide-react';
import type { User } from '@/types';

interface TaskModalProps {
  members: User[];
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: { title?: string; description?: string; assigneeId?: string }) => void;
}

const TaskModal = ({ members, onDelete, onUpdate }: TaskModalProps) => {
  const { selectedTask, isTaskModalOpen, closeTaskModal } = useBoardStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Sync local state when task changes
  const task = selectedTask;
  if (task && title === '' && !description) {
    // Initialize on open
    setTimeout(() => {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssigneeId(task.assigneeId || '');
    }, 0);
  }

  const handleClose = () => {
    if (task) {
      onUpdate(task.id, { title, description, assigneeId: assigneeId || undefined });
    }
    setTitle('');
    setDescription('');
    setAssigneeId('');
    closeTaskModal();
  };

  const handleDelete = () => {
    if (task) {
      onDelete(task.id);
      setTitle('');
      setDescription('');
      setAssigneeId('');
      closeTaskModal();
    }
  };

  return (
    <Dialog open={isTaskModalOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="rounded-xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit Task</DialogTitle>
          <DialogDescription className="sr-only">Edit task details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg text-base font-medium" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description..." className="rounded-lg min-h-[80px] resize-none" />
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity placeholder */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>Activity</span>
            </div>
            <p className="text-xs text-muted-foreground italic">No activity yet</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-lg gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;
