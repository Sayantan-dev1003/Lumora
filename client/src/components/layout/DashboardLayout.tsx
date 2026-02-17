import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
    return (
        <div className="flex min-h-screen bg-background font-sans text-foreground">
            <Sidebar />
            <main className="flex-1 max-w-7xl mx-auto w-full overflow-y-auto">
                <div className="p-4 md:p-6 h-full w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
