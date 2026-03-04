import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { connectSocket, getSocket } from '@/services/socket';
import { toast } from 'sonner';

const GlobalSocket = () => {
    const queryClient = useQueryClient();
    const { user, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const socket = connectSocket();

        const handleMemberRemoved = ({ boardId, userId }: { boardId: string, userId: string }) => {
            if (user.id === userId) {
                // If the user was kicked from a board they are NOT currently viewing,
                // we just need to invalidate their boards list so it disappears.
                // (If they are reviewing the board, Board.tsx handles the kick & navigation).
                queryClient.invalidateQueries({ queryKey: ['boards'] });
                toast.info("You've been removed from a board or have no remaining tasks on it.");
            }
        };

        // We listen globally
        socket.on('member_removed', handleMemberRemoved);

        return () => {
            socket.off('member_removed', handleMemberRemoved);
        };
    }, [isAuthenticated, user, queryClient]);

    return null;
};

export default GlobalSocket;
