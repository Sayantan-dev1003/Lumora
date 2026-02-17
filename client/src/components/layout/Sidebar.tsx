import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
    LayoutDashboard,
    CheckSquare,
    PlusSquare,
    Activity,
    Settings,
    LogOut,
    User as UserIcon
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getInitials } from '@/lib/utils';

const Sidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuthStore();

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'My Tasks', path: '/assigned', icon: CheckSquare },
        { name: 'My Boards', path: '/created', icon: PlusSquare },
        { name: 'Activity', path: '/activity', icon: Activity },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <aside className="hidden md:flex w-64 flex-col border-r border-border/40 bg-sidebar/50 backdrop-blur-xl p-4 gap-6 sticky top-0 h-screen">
            <div className="flex items-center px-2 py-1 mb-2">
                {/* Logo */}
                <div className="flex items-center gap-2 pl-2">
                    <img src="/logo.png" alt="Lumora" className="h-16 w-auto" />
                </div>
            </div>

            <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border/40 pt-4 mt-auto">
                <div className="flex items-center gap-3 px-2 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                    <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-foreground font-medium">
                            {getInitials(user?.name || 'User')}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{user?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={logout}
                        className="shrink-0 h-8 w-8 text-amber-700 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
