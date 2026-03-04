import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ListTodo, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBoard } from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface BoardCardProps {
    board: {
        id: string;
        title: string;
        updatedAt: string;
        members?: Array<{
            user: {
                id: string;
                name: string;
                avatar?: string;
            };
        }>;
        lists?: Array<{
            _count?: {
                tasks?: number;
            };
            tasks?: Array<{
                id: string;
            }>;
        }>;
        owner?: {
            id: string;
        };
    };
}

const BoardCard = ({ board }: BoardCardProps) => {
    const navigate = useNavigate();
    const currentUser = useAuthStore(s => s.user);
    const queryClient = useQueryClient();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: () => deleteBoard(board.id),
        onSuccess: () => {
            toast.success('Board deleted');
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        },
        onError: () => toast.error('Failed to delete board')
    });

    return (
        <>
            <Card
                className="group cursor-pointer rounded-2xl border-border/40 bg-card hover:bg-gradient-to-br hover:from-card hover:to-accent/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative"
                onClick={() => navigate(`/board/${board.id}`)}
            >
                <CardHeader className="pb-3 pt-5">
                    <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-lg font-semibold tracking-tight line-clamp-1 flex items-center gap-2">
                            {board.title}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
                            </div>
                            {/* {currentUser?.id === board.owner?.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive z-10 h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )} */}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mt-2">
                        {/* Stacked Avatars */}
                        <div className="flex -space-x-2 overflow-hidden">
                            {board.members?.slice(0, 3).map((member) => (
                                <Avatar key={member.user.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                                    <AvatarImage src={member.user.avatar} />
                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {getInitials(member.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {(board.members?.length || 0) > 3 && (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground">
                                    +{board.members!.length - 3}
                                </div>
                            )}
                        </div>

                        {/* Task Count (Assigned vs Total) */}
                        {(() => {
                            if ((board as any).isCompleted) {
                                return (
                                    <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Completed</span>
                                    </div>
                                );
                            }

                            const assignedTaskCount = board.lists?.reduce((acc: number, list: any) => acc + (list.tasks?.length || 0), 0) || 0;
                            const totalTaskCount = board.lists?.reduce((acc: number, list: any) => acc + (list._count?.tasks || 0), 0) || 0;
                            const hasAssignedTasks = assignedTaskCount > 0;

                            return (
                                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md ${hasAssignedTasks ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/30 text-muted-foreground"}`}>
                                    <ListTodo className="h-3.5 w-3.5" />
                                    <span>
                                        {hasAssignedTasks ? `${assignedTaskCount} assigned` : `${totalTaskCount} tasks`}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="rounded-xl sm:max-w-md" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Board
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-muted-foreground text-sm">
                        Are you sure you want to delete this board? This action cannot be undone and will permanently remove all associated data.
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="rounded-xl" onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(false); }}>
                            Cancel
                        </Button>
                        <Button variant="destructive" className="rounded-xl" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); setIsDeleteDialogOpen(false); }} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default BoardCard;
