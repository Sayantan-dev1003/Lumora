import { useState } from 'react';
import { useBoardStore } from '@/store/boardStore';
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
  onUpdate: (taskId: string, updates: { title?: string; description?: string; assigneeId?: string }) => void;
}

const TaskModal = ({ members, onDelete, onUpdate }: TaskModalProps) => {
  const { selectedTask, isTaskModalOpen, closeTaskModal } = useBoardStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
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
  if (task && title === '' && !description) {
    // Initialize on open
    setTimeout(() => {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssigneeId(task.assigneeId || '');
    }, 0);
  }

  const handleClose = () => {
    // We'll keep auto-save on close as a convenience, but the Save button will be the primary action.
    if (task) {
      onUpdate(task.id, { title, description, assigneeId: assigneeId || undefined });
    }
    closeTaskModal();
  };

  const handleSave = () => {
    if (task) {
      onUpdate(task.id, { title, description, assigneeId: assigneeId || undefined });
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg text-base font-medium" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description..." className="rounded-lg min-h-[80px] resize-none" />
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between rounded-lg">
                  {assigneeId ? allUsers.find((u) => u.id === assigneeId)?.name || "Unknown User" : "Unassigned"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search users by name or email..." onValueChange={(val) => {
                    setSearchTerm(val);
                    // Simple inline search for local members + API call debounce
                    if (val.length > 0) {
                      searchUsersApi(val).then(setFoundUsers).catch(console.error);
                    } else {
                      setFoundUsers([]);
                    }
                  }} />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                      <CommandItem onSelect={() => { setAssigneeId(""); setOpenCombobox(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", assigneeId === "" ? "opacity-100" : "opacity-0")} />
                        Unassigned
                      </CommandItem>
                      {allUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.name}
                          onSelect={() => {
                            setAssigneeId(user.id);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", assigneeId === user.id ? "opacity-100" : "opacity-0")} />
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

          {/* Activity placeholder */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>Activity</span>
            </div>
            <p className="text-xs text-muted-foreground italic">No activity yet</p>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-lg gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button size="sm" onClick={handleSave} className="rounded-lg px-6">
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;
