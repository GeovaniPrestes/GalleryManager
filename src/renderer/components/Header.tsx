function Header() {
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

                <button className="header-button" title="Atualizar biblioteca">
                    ↻
                </button>
            </div>
        </header>
    );
}

export default Header;
