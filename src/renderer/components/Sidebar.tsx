interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

function Sidebar({ activePage, onNavigate }: SidebarProps) {
    const menuItems = [
        { id: "dashboard", label: "Visão geral" },
        { id: "models", label: "Modelos" },
        { id: "sets", label: "Sets" },
        { id: "minisets", label: "Minisets" },
        { id: "media", label: "Mídias" },
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