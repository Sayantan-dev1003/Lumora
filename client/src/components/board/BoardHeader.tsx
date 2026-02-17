import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@/types';

interface BoardHeaderProps {
  title: string;
  members: User[];
}

const BoardHeader = ({ title, members }: BoardHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/40 bg-background/60 backdrop-blur-md sticky top-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <img src="/logo.png" alt="Lumora" className="h-12" />
      </div>
      <div className="flex items-center -space-x-2">
        <h1 className="text-lg md:text-xl font-bold mr-6">{title}</h1>
        {members.slice(0, 4).map((m) => (
          <Avatar key={m.id} className="h-8 w-8 border-2 border-background">
            <AvatarFallback className="text-xs bg-accent text-accent-foreground">
              {m.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        ))}
        {members.length > 4 && (
          <Avatar className="h-8 w-8 border-2 border-background">
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              +{members.length - 4}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
};

export default BoardHeader;
