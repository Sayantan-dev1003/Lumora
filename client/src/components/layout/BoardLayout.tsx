import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const BoardLayout = () => {
    return (
        <div className="flex h-screen bg-background font-sans text-foreground overflow-hidden">
            <Sidebar />
            <main className="flex-1 w-full relative flex flex-col overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default BoardLayout;
