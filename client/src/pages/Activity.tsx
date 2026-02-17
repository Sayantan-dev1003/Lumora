import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGlobalActivity } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Activity as ActivityIcon,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Plus,
    Trash,
    ArrowRight,
    Edit,
    CheckCircle2,
    MessageSquare,
    UserPlus
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';



const getActionIcon = (actionType: string) => {
    const type = actionType.toLowerCase();
    if (type.includes('create') || type.includes('add')) return <Plus className="h-4 w-4" />;
    if (type.includes('delete') || type.includes('remove')) return <Trash className="h-4 w-4" />;
    if (type.includes('move')) return <ArrowRight className="h-4 w-4" />;
    if (type.includes('update') || type.includes('edit')) return <Edit className="h-4 w-4" />;
    if (type.includes('complete')) return <CheckCircle2 className="h-4 w-4" />;
    if (type.includes('comment')) return <MessageSquare className="h-4 w-4" />;
    if (type.includes('assign')) return <UserPlus className="h-4 w-4" />;
    return <ActivityIcon className="h-4 w-4" />;
};

const getActionColor = (actionType: string) => {
    const type = actionType.toLowerCase();
    if (type.includes('create') || type.includes('add') || type.includes('complete'))
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (type.includes('delete') || type.includes('remove'))
        return 'bg-red-500/10 text-red-600 border-red-500/20';
    if (type.includes('move') || type.includes('assign'))
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (type.includes('update') || type.includes('edit'))
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-primary/10 text-primary border-primary/20';
};

const groupActivitiesByDate = (activities: any[]) => {
    const groups: { [key: string]: any[] } = {};
    activities.forEach((activity) => {
        const date = new Date(activity.createdAt);
        let key = format(date, 'yyyy-MM-dd');
        if (isToday(date)) key = 'Today';
        else if (isYesterday(date)) key = 'Yesterday';
        else key = format(date, 'MMMM d, yyyy');

        if (!groups[key]) groups[key] = [];
        groups[key].push(activity);
    });
    return groups;
};

const ActivityPage = () => {
    const [page, setPage] = useState(1);

    // We strictly want "My Activities" as per requirement
    const { data, isLoading } = useQuery({
        queryKey: ['global-activity', page, 'mine'],
        queryFn: () => fetchGlobalActivity(page, 20, 'mine'),
    });

    const activities = data?.data || [];
    const pagination = data?.pagination || { page: 1, totalPages: 1 };
    const groupedActivities = groupActivitiesByDate(activities);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-bold font-heading bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Activity Log
                    </h1>
                    <p className="text-muted-foreground text-lg">Track your journey and contributions across all projects.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-8">
                    {activities.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-3xl bg-muted/20">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <ActivityIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No activity yet</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                When you create boards, tasks, or make changes, they will appear here.
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedActivities).map(([dateLabel, groupActivities]) => (
                            <div key={dateLabel} className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-background border-border/60 shadow-sm">
                                        {dateLabel}
                                    </Badge>
                                    <div className="h-px bg-border/40 flex-1"></div>
                                </div>
                                <div className="grid gap-3">
                                    {groupActivities.map((activity: any) => (
                                        <Card
                                            key={activity.id}
                                            className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all duration-200 group bg-card/50 hover:bg-card"
                                        >
                                            <CardContent className="p-4 flex gap-4 items-start">
                                                <div className="relative">
                                                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                                        <AvatarImage src="" /> {/* Placeholder if we had real avatars */}
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                            {getInitials(activity.user.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${getActionColor(activity.actionType)}`}>
                                                        {getActionIcon(activity.actionType)}
                                                    </div>
                                                </div>

                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                                        <p className="text-sm leading-relaxed">
                                                            <span className="font-semibold text-foreground mr-1">{activity.user.name}</span>
                                                            <span className="text-muted-foreground">
                                                                {activity.actionType.replace(/_/g, ' ').toLowerCase()}
                                                            </span>
                                                            {" "}
                                                            <span className="font-medium text-foreground px-1.5 py-0.5 rounded-md bg-muted/50 border border-border/40 text-xs">
                                                                {activity.entityType.toLowerCase()}
                                                            </span>
                                                        </p>
                                                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                                            {format(new Date(activity.createdAt), 'h:mm a')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                                            {activity.board?.title || 'Unknown Board'}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-10 pt-6 border-t border-border/40">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 gap-2 rounded-xl"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <span className="text-sm font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
                                Page {page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 gap-2 rounded-xl"
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityPage;
