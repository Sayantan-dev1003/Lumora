import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBoards, createBoard, fetchDashboardStats } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, LayoutDashboard, Users, CheckCircle2, Circle, Clock, AlertCircle, ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import BoardCard from '@/components/BoardCard';

const Dashboard = () => {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: boardsData, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards', page],
    queryFn: () => fetchBoards(page, 6),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetchDashboardStats(),
  });

  const boards = boardsData?.boards || [];
  const pagination = boardsData?.total ? {
    page: page,
    totalPages: Math.ceil(boardsData.total / 6)
  } : { page: 1, totalPages: 1 };

  const stats = statsData?.stats;
  const recentActivity = statsData?.recentActivity || [];

  const createMutation = useMutation({
    mutationFn: (title: string) => createBoard(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCreateOpen(false);
      setNewTitle('');
    },
  });

  const filtered = boards.filter((b: any) => b.title?.toLowerCase().includes(search.toLowerCase()));


  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground">Here's what's happening in your projects.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl gap-2 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5" size="lg">
            <Plus className="h-5 w-5" /> New Board
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Boards" value={stats?.totalBoards ?? '-'} icon={LayoutDashboard} />
        <StatsCard title="Total Tasks" value={stats?.totalTasks ?? '-'} icon={ListTodo} />
        <StatsCard title="Tasks Assigned to Me" value={stats?.assignedToMe ?? '-'} icon={Users} className="text-blue-500" />
        <StatsCard title="Active Tasks" value={stats?.activeTasks ?? '-'} icon={Clock} className="text-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Boards List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Boards</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search boards..."
                className="pl-9 h-9 text-sm rounded-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {boardsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse bg-muted/40 rounded-2xl border border-border/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-3xl bg-muted/20">
              <div className="bg-background p-3 rounded-full inline-flex mb-3 shadow-sm">
                <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No boards found</h3>
              <Button onClick={() => setCreateOpen(true)} variant="link" className="text-primary">
                Create a new board
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((board: any) => (
                  <BoardCard key={board.id} board={board} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Button variant="link" className="text-sm text-primary p-0 h-auto" onClick={() => navigate('/activity')}>
              View All
            </Button>
          </div>
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No recent activity</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {recentActivity.map((activity: any) => (
                    <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-medium">{activity.user.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {activity.actionType.replace(/_/g, ' ').toLowerCase()} <span className="font-medium text-foreground">{activity.entityType.toLowerCase()}</span>
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      <div className="mt-2.5 inline-block">
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 truncate max-w-[150px] inline-block">
                          {activity.board?.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Removed "View All Activity" button as request implies focusing on these 3, or we can keep it if needed. Leaving it out for now to cleaner look, or verify if requested? Request said "only show latest 3". It didn't strictly say remove 'view all'. But typically 'only show X' implies limiting the view. I'll leave the button if user wants to see history. Actually, let's keep it but maybe visually de-emphasize or remove if 3 is all they want to see here. I'll remove it to strictly follow "only show latest 3". */}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Board Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Board title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rounded-xl"
            onKeyDown={(e) => e.key === 'Enter' && newTitle.trim() && createMutation.mutate(newTitle.trim())}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())} disabled={!newTitle.trim()} className="rounded-xl">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatsCard = ({ title, value, icon: Icon, className }: any) => (
  <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative">
    <CardContent className="p-5 flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </div>
      <div className={`p-2.5 rounded-xl bg-background/50 border border-border/50 ${className || 'text-primary'}`}>
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
