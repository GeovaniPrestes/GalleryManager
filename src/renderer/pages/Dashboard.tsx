import { useEffect, useState } from "react";

interface DashboardData {
    statistics: {
        models: number;
        sets: number;
        minisets: number;
        media: number;
    };
    recentActivity: Array<{
        id: number;
        entity: string;
        entityId: number | null;
        action: "create" | "update" | "delete";
        description: string;
        changes: string | null;
        createdAt: Date;
    }>;
}

function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDashboard() {
            try {
                const result = await window.electronAPI.getDashboardData();
                setData(result);
            } catch (error) {
                console.error("Erro ao carregar Dashboard:", error);
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    const statistics = [
        { title: "Modelos", value: data?.statistics.models ?? 0 },
        { title: "Sets", value: data?.statistics.sets ?? 0 },
        { title: "Minisets", value: data?.statistics.minisets ?? 0 },
        { title: "Mídias", value: data?.statistics.media ?? 0 }
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
                        <strong>
                            {loading ? "..." : item.value.toLocaleString("pt-BR")}
                        </strong>
                    </div>
                ))}
            </section>

            <section className="activity-section">
                <div className="section-heading">
                    <h2>Atividade recente</h2>
                </div>

                {!loading && (!data || data.recentActivity.length === 0) ? (
                    <div className="empty-state">
                        <h3>Nenhuma atividade registrada</h3>
                        <p>
                            Quando você começar a cadastrar modelos e sets,
                            as atividades aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="activity-list">
                        {data?.recentActivity.map((log) => (
                            <div className="activity-item" key={log.id}>
                                <strong className={`audit-action audit-${log.action}`}>
                                    {log.action === "create"
                                        ? "Criação"
                                        : log.action === "update"
                                            ? "Alteração"
                                            : "Exclusão"}
                                </strong>

                                <div>
                                    <p>{log.description}</p>
                                    <span>
                                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </section>
        </div>
    );
}

export default Dashboard;
