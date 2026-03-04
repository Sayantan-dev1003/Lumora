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
                queryClient.invalidateQueries({ queryKey: ['boards'] });
                toast.info("You've been removed from a board or have no remaining tasks on it.");
            }
        };
        socket.on('member_removed', handleMemberRemoved);

        return () => {
            socket.off('member_removed', handleMemberRemoved);
        };
    }, [isAuthenticated, user, queryClient]);

    return null;
};

export default GlobalSocket;
