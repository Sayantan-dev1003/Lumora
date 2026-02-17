import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ListTodo } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getInitials } from '@/lib/utils';

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
    };
}

const BoardCard = ({ board }: BoardCardProps) => {
    const navigate = useNavigate();

    return (
        <Card
            className="group cursor-pointer rounded-2xl border-border/40 bg-card hover:bg-gradient-to-br hover:from-card hover:to-accent/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
            onClick={() => navigate(`/board/${board.id}`)}
        >
            <CardHeader className="pb-3 pt-5">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold tracking-tight line-clamp-1">{board.title}</CardTitle>
                    <div className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
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
    );
};

export default BoardCard;
