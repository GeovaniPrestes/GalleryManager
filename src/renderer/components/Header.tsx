interface HeaderProps {
    editingEnabled: boolean;
    onToggleEditing: () => void;
}

function Header({
    editingEnabled,
    onToggleEditing
}: HeaderProps) {
    return (
        <header className="app-header">
            <div className="header-search">
                <span className="search-icon">⌕</span>

                <input
                    type="text"
                    placeholder="Pesquisar modelos, sets, minisets e mídias..."
                />
            </div>

            <div className="header-actions">
                <span className="library-status">
                    Biblioteca local
                </span>

                <button
                    type="button"
                    className={`editing-toggle ${editingEnabled ? "active" : ""}`}
                    onClick={onToggleEditing}
                    aria-pressed={editingEnabled}
                >
                    <span className="toggle-indicator" />
                    Edição: {editingEnabled ? "Ativada" : "Desativada"}
                </button>

                <button className="header-button" title="Atualizar biblioteca">
                    ↻
                </button>
            </div>
        </header>
    );
}

export default Header;
