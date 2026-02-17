import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User } from '@/types';
import { getInitials } from '@/lib/utils';

interface BoardHeaderProps {
  title: string;
  members: User[];
}

const BoardHeader = ({ title, members }: BoardHeaderProps) => {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center -space-x-3 hover:space-x-1 transition-all duration-300">
          {members.slice(0, 5).map((m, index) => (
            <Avatar
              key={m.id}
              className="h-9 w-9 border-2 border-background shadow-sm ring-2 ring-transparent hover:ring-primary/20 hover:z-10 transition-all duration-300"
              style={{ zIndex: 5 - index }}
            >
              <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-accent to-accent/50 text-accent-foreground">
                {getInitials(m.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {members.length > 5 && (
            <div className="h-9 w-9 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shadow-sm z-0">
              +{members.length - 5}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default BoardHeader;
