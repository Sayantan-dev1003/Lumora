import { useState, useEffect } from 'react';
import { useBoardStore } from '@/store/boardStore';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, MessageSquare, Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchUsersApi } from '@/services/api';
import { cn } from "@/lib/utils";

import type { User } from '@/types';

interface TaskModalProps {
  members: User[];
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: { title?: string; description?: string; assignedUserId?: string; status?: string; }) => void;
  userRole: string;
}

const TaskModal = ({ members, onDelete, onUpdate, userRole }: TaskModalProps) => {
  const { selectedTask, isTaskModalOpen, closeTaskModal } = useBoardStore();
  const currentUser = useAuthStore((s) => s.user);

  // Determine permissions
  const isCreator = selectedTask?.creatorId === currentUser?.id;
  const isAdmin = userRole === 'admin';
  const isAssignee = selectedTask?.assignedUserId === currentUser?.id;

  const canEditDetails = isAdmin || (isCreator && userRole === 'member');
  const canAssign = isAdmin;

  const isTaskCompleted = selectedTask?.status === 'DONE';

  const isReadOnlyDetails = !canEditDetails || isTaskCompleted;
  const canAssignActual = canAssign && !isTaskCompleted;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [status, setStatus] = useState('TODO');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Combine members and found users, removing duplicates
  const allUsers = [...members];
  foundUsers.forEach(u => {
    if (!allUsers.find(m => m.id === u.id)) {
      allUsers.push(u);
    }
  });


  // Sync local state when task changes
  const task = selectedTask;
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setAssignedUserId(task.assignedUserId || '');
      setStatus(task.status || 'TODO');
    } else {
      setTitle('');
      setDescription('');
      setAssignedUserId('');
      setStatus('TODO');
    }
  }, [task]);

  const isDirty = task ? (
    title !== task.title ||
    description !== (task.description || '') ||
    assignedUserId !== (task.assignedUserId || '') ||
    status !== (task.status || 'TODO')
  ) : false;

  const handleClose = () => {
    // Only close without saving. Remove auto-save behavior.
    closeTaskModal();
  };

  const handleSave = () => {
    if (task) {
      onUpdate(task.id, { title, description, assignedUserId: assignedUserId || undefined, status });
      closeTaskModal();
    }
  };

  const handleDelete = () => {
    if (task) {
      onDelete(task.id);
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
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isReadOnlyDetails}
              className="rounded-lg text-base font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isReadOnlyDetails ? "No description" : "Add a description..."}
              disabled={isReadOnlyDetails}
              className="rounded-lg min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild disabled={!canAssignActual}>
                <Button variant="outline" role="combobox" aria-expanded={openCombobox} disabled={!canAssignActual} className="w-full justify-between rounded-lg">
                  {assignedUserId ? allUsers.find((u) => u.id === assignedUserId)?.name || "Unknown User" : "Unassigned"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search users by name or email..." onValueChange={(val) => {
                    setSearchTerm(val);
                    if (val.length > 0) {
                      searchUsersApi(val).then(setFoundUsers).catch(console.error);
                    } else {
                      setFoundUsers([]);
                    }
                  }} />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                      <CommandItem onSelect={() => { setAssignedUserId(""); setOpenCombobox(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", assignedUserId === "" ? "opacity-100" : "opacity-0")} />
                        Unassigned
                      </CommandItem>
                      {allUsers.filter(u => u.id !== currentUser?.id).map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.name}
                          onSelect={() => {
                            setAssignedUserId(user.id);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", assignedUserId === user.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span>{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={setStatus}
              disabled={isTaskCompleted || (!canEditDetails && !isAssignee)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="TODO"
                  disabled={(task?.status || 'TODO') !== 'TODO'}
                >
                  To Do
                </SelectItem>
                <SelectItem
                  value="IN_PROGRESS"
                  disabled={!(((task?.status || 'TODO') === 'TODO' && isAssignee) || task?.status === 'IN_PROGRESS')}
                >
                  In Progress
                </SelectItem>
                <SelectItem
                  value="IN_REVIEW"
                  disabled={!((task?.status === 'IN_PROGRESS' && isAssignee) || task?.status === 'IN_REVIEW')}
                >
                  In Review
                </SelectItem>
                <SelectItem
                  value="DONE"
                  disabled={!((task?.status === 'IN_REVIEW' && (isAdmin || isCreator)) || task?.status === 'DONE')}
                >
                  Done
                </SelectItem>
              </SelectContent>
            </Select>
            {(!isAdmin && !isCreator && isAssignee) && (
              <p className="text-xs text-muted-foreground mt-1">
                You can progress this task forward up to "In Review".
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            {canEditDetails && !isTaskCompleted && (
              <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-lg gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            {!(canEditDetails && !isTaskCompleted) && <div />} {/* Spacer */}

            {(canEditDetails || canAssign || isAssignee) && !isTaskCompleted && (
              <Button size="sm" onClick={handleSave} className="rounded-lg px-6">
                Save
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;
