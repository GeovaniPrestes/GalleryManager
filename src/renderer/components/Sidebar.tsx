interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

function Sidebar({ activePage, onNavigate }: SidebarProps) {
    const menuItems = [
        { id: "models", label: "Modelos" },
        { id: "dashboard", label: "Dashboard" },
        { id: "sets", label: "Sets" },
        { id: "media", label: "Mídias" },
        { id: "audit", label: "Histórico de atividades" },
        { id: "tags", label: "Tags" }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <h2>GaleryManager</h2>
                <span>MEDIA LIBRARY</span>
            </div>

            <nav className="sidebar-nav">
                <span className="nav-section">BIBLIOTECA</span>

                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activePage === item.id ? "active" : ""}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;