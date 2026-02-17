import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBoards, searchTasks } from '@/services/api'; // searchTasks handles filtering
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AssignedToMe = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    // Fetch Boards I am a member of (Assigned)
    const { data: boardsData, isLoading: boardsLoading } = useQuery({
        queryKey: ['boards', 'member'],
        queryFn: () => fetchBoards(1, 100, 'member'),
    });

    // Fetch Tasks Assigned to Me
    const { data: tasks, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks', 'assigned', search],
        queryFn: () => searchTasks(search, undefined, 'assigned'),
    });

    const isLoading = boardsLoading || tasksLoading;

    return (
        <div className="h-full overflow-y-auto p-6 md:p-10 w-full max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
                    <p className="text-muted-foreground">Tasks and boards you are working on.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Boards Section */}
                    {boardsData?.boards?.length ? (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Boards</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {boardsData.boards.map((board: any) => (
                                    <Card
                                        key={board.id}
                                        className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                                        onClick={() => navigate(`/board/${board.id}`)}
                                    >
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">{board.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">{board.memberCount} members</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* Tasks Section */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Tasks</h2>
                        {tasks?.length === 0 ? (
                            <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground">
                                No tasks assigned to you found.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks?.map((task: any) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                            <div>
                                                <h3 className="font-medium group-hover:text-primary transition-colors">{task.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{task.list?.title || 'List'}</span>
                                                    <span>•</span>
                                                    <span>{format(new Date(task.updatedAt), 'MMM d')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {task.dueDate && (
                                                <Badge variant="outline" className="font-normal">
                                                    {format(new Date(task.dueDate), 'MMM d')}
                                                </Badge>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/board/${task.list?.boardId}`)}>
                                                View Board
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AssignedToMe;
