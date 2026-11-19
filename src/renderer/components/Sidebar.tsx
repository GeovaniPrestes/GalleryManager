function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <h2>GaleryManager</h2>
                <span>MEDIA LIBRARY</span>
            </div>

            <nav className="sidebar-nav">
                <span className="nav-section">BIBLIOTECA</span>

                <button className="nav-item active">
                    Visão geral
                </button>

                <button className="nav-item">
                    Modelos
                </button>

                <button className="nav-item">
                    Sets
                </button>

                <button className="nav-item">
                    Minisets
                </button>

                <button className="nav-item">
                    Mídias
                </button>

                <button className="nav-item">
                    Tags
                </button>
            </nav>
        </aside>
    );
}

export default Sidebar;
