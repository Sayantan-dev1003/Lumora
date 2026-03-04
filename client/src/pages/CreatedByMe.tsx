import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBoards, createBoard } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BoardCard from '@/components/BoardCard';

const CreatedByMe = () => {
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (title: string) => createBoard(title),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setCreateOpen(false);
            setNewTitle('');
        },
    });

    // Fetch Boards Created by Me
    const { data: boardsData, isLoading } = useQuery({
        queryKey: ['boards', 'created', page],
        queryFn: () => fetchBoards(page, 9, 'created'),
    });

    const allBoards = boardsData?.boards || [];
    const pagination = boardsData?.total ? {
        page: page,
        totalPages: Math.ceil(boardsData.total / 9)
    } : { page: 1, totalPages: 1 };

    // Filter boards based on search
    const filteredBoards = allBoards.filter((b: any) =>
        b.title?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        My Boards
                    </h1>
                    <p className="text-muted-foreground">Manage boards you created and collaborate on others.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Boards..."
                            className="pl-9 h-10 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto rounded-xl gap-2 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5" size="lg">
                        <Plus className="h-5 w-5" /> New Board
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBoards.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl bg-muted/20">
                            <p className="text-muted-foreground">You haven't created any boards yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredBoards.map((board: any) => (
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
            )}

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
                        <Button onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())} disabled={!newTitle.trim() || createMutation.isPending} className="rounded-xl">
                            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CreatedByMe;
