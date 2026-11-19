function Dashboard() {
    const statistics = [
        { title: "Modelos", value: 0 },
        { title: "Sets", value: 0 },
        { title: "Minisets", value: 0 },
        { title: "Mídias", value: 0 }
    ];

    return (
        <div className="dashboard">
            <div className="page-heading">
                <div>
                    <h1>Visão geral</h1>
                    <p>Acompanhe sua biblioteca de mídia.</p>
                </div>
            </div>

            <section className="statistics-grid">
                {statistics.map((item) => (
                    <div className="stat-card" key={item.title}>
                        <span>{item.title}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
            </section>

            <section className="activity-section">
                <div className="section-heading">
                    <h2>Atividade recente</h2>
                </div>

                <div className="empty-state">
                    <h3>Nenhuma atividade registrada</h3>
                    <p>
                        Quando você começar a cadastrar modelos e sets,
                        as atividades aparecerão aqui.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default Dashboard;
