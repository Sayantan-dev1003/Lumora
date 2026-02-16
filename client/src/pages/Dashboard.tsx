import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBoards, createBoard } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, LogOut, LayoutDashboard, Users } from 'lucide-react';

const Dashboard = () => {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: boardsData, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: () => fetchBoards(),
  });

  const boards = boardsData?.boards || [];

  const createMutation = useMutation({
    mutationFn: (title: string) => createBoard(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setCreateOpen(false);
      setNewTitle('');
    },
  });

  const filtered = boards.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar p-4 gap-4">
        <div className="flex items-center">
          <img src="/logo.png" alt="Lumora" className="h-16" />
        </div>
        <nav className="flex-1 space-y-1">
          <button className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground">
            <LayoutDashboard className="h-4 w-4" /> Boards
          </button>
          <button className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/50 transition-colors">
            <Users className="h-4 w-4" /> Members
          </button>
        </nav>
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Your Boards</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search boards..." className="pl-9 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setCreateOpen(true)} className="rounded-xl gap-1">
              <Plus className="h-4 w-4" /> New Board
            </Button>
          </div>
        </div>

        {/* Mobile logout */}
        <div className="md:hidden mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No boards found</h3>
            <p className="text-muted-foreground text-sm">Create a new board to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer rounded-xl hover:shadow-md transition-shadow border-border/50 hover:border-accent"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{board.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{board.memberCount} members</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

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

export default Dashboard;
