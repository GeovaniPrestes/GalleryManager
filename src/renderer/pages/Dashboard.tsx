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
    rankings: {
        topModelsBySets: Array<{
            modelId: number;
            modelName: string;
            totalSets: number;
            totalMedia: number;
            totalSize: number;
        }>;
        topModelsBySize: Array<{
            modelId: number;
            modelName: string;
            totalSets: number;
            totalMedia: number;
            totalSize: number;
        }>;
        topModelsByMedia: Array<{
            modelId: number;
            modelName: string;
            totalSets: number;
            totalMedia: number;
            totalSize: number;
        }>;
    };
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const units = ["Bytes", "KB", "MB", "GB", "TB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    const size = bytes / Math.pow(1024, index);

    return `${size.toFixed(2)} ${units[index]}`;
}


interface ModelRankingProps {
    title: string;
    icon: string;
    models: Array<{
        modelId: number;
        modelName: string;
        totalSets: number;
        totalMedia: number;
        totalSize: number;
    }>;
    metric: "sets" | "media" | "size";
}

function ModelRanking({
    title,
    icon,
    models,
    metric
}: ModelRankingProps) {
    const maxValue = Math.max(
        ...models.map(model =>
            metric === "sets"
                ? Number(model.totalSets)
                : metric === "media"
                    ? Number(model.totalMedia)
                    : Number(model.totalSize)
        ),
        1
    );

    function getValue(model: ModelRankingProps["models"][number]) {
        if (metric === "sets") {
            return `${model.totalSets} Sets`;
        }

        if (metric === "media") {
            return `${model.totalMedia.toLocaleString("pt-BR")} mídias`;
        }

        return formatFileSize(Number(model.totalSize));
    }

    function getProgress(model: ModelRankingProps["models"][number]) {
        const value =
            metric === "sets"
                ? Number(model.totalSets)
                : metric === "media"
                    ? Number(model.totalMedia)
                    : Number(model.totalSize);

        return (value / maxValue) * 100;
    }

    return (
        <section className="ranking-card">
            <div className="ranking-heading">
                <span className="ranking-icon">{icon}</span>
                <h3>{title}</h3>
            </div>

            {models.length === 0 ? (
                <div className="empty-state">
                    <p>Nenhum dado disponível.</p>
                </div>
            ) : (
                <div className="ranking-list">
                    {models.map((model, index) => (
                        <div className="ranking-item" key={model.modelId}>
                            <div className="ranking-item-info">
                                <span className="ranking-position">
                                    #{index + 1}
                                </span>

                                <span className="ranking-name" title={model.modelName}>
                                    {model.modelName}
                                </span>

                                <strong className="ranking-value">
                                    {getValue(model)}
                                </strong>
                            </div>

                            <div className="ranking-progress">
                                <div
                                    className="ranking-progress-fill"
                                    style={{
                                        width: `${getProgress(model)}%`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>

    );
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

            <section className="rankings-section">
                <div className="section-heading">
                    <h2>Ranking de modelos</h2>
                </div>

                <div className="rankings-grid">
                    <ModelRanking
                        title="Mais Sets"
                        icon="🏆"
                        models={data?.rankings.topModelsBySets ?? []}
                        metric="sets"
                    />

                    <ModelRanking
                        title="Maior espaço ocupado"
                        icon="💾"
                        models={data?.rankings.topModelsBySize ?? []}
                        metric="size"
                    />

                    <ModelRanking
                        title="Mais conteúdos"
                        icon="🖼️"
                        models={data?.rankings.topModelsByMedia ?? []}
                        metric="media"
                    />
                </div>
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
                                    <span className="activity-icon">
                                        {log.action === "create"
                                            ? "+"
                                            : log.action === "update"
                                                ? "✎"
                                                : "×"}
                                    </span>

                                    {log.action === "create"
                                        ? "Criação"
                                        : log.action === "update"
                                            ? "Alteração"
                                            : "Exclusão"}
                                </strong>

                                <div>
                                    <p>{log.description}</p>
                                    <span>
                                        {new Date(log.createdAt).toLocaleDateString("pt-BR", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric"
                                        })}
                                        {" • "}
                                        {new Date(log.createdAt).toLocaleTimeString("pt-BR", {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
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
