import Sidebar from "./Sidebar";
import Header from "./Header";

interface MainLayoutProps {
    children: React.ReactNode;
    activePage: string;
    onNavigate: (page: string) => void;
}

function MainLayout({
    children,
    activePage,
    onNavigate
}: MainLayoutProps) {
    return (
        <div className="app-layout">
            <Sidebar
                activePage={activePage}
                onNavigate={onNavigate}
            />

            <div className="main-area">
                <Header />

                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default MainLayout;