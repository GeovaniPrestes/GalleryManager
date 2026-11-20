import { useEffect, useState } from "react";

function Audit() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionFilter, setActionFilter] = useState<
        "create" | "update" | "delete" | ""
    >("");
    const [entityFilter, setEntityFilter] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const pageSize = 50;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        async function loadLogs() {
            try {
                setLoading(true);

                const result = await window.electronAPI.listAuditLogs({
                    limit: pageSize,
                    offset: (page - 1) * pageSize,
                    action: actionFilter || undefined,
                    entity: entityFilter || undefined
                });

                setLogs(result.logs);
                setTotal(result.total);
            } catch (error) {
                console.error("Erro ao carregar auditoria:", error);
                setError("Não foi possível carregar o histórico.");
            } finally {
                setLoading(false);
            }
        }

        loadLogs();
    }, [actionFilter, entityFilter, page]);

    return (
        <div>
            <h1>Histórico de atividades</h1>
            <div className="audit-filters">
                <select
                    value={actionFilter}
                    onChange={(e) => {
                        setActionFilter(e.target.value as typeof actionFilter);
                        setPage(1);
                    }}
                >
                    <option value="">Todas as ações</option>
                    <option value="create">Criações</option>
                    <option value="update">Alterações</option>
                    <option value="delete">Exclusões</option>
                </select>

                <select
                    value={entityFilter}
                    onChange={(e) => {
                        setEntityFilter(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Todas as entidades</option>
                    <option value="Model">Modelos</option>
                    <option value="GallerySet">Sets</option>
                    <option value="Miniset">Minisets</option>
                    <option value="Media">Mídias</option>
                    <option value="MediaLocation">Localizações</option>
                </select>
            </div>
            {loading && <p>Carregando histórico...</p>}

            {error && <p>{error}</p>}

            {!loading && !error && logs.length === 0 && (
                <p>Nenhuma atividade registrada.</p>
            )}

            {!loading && logs.map(log => (
                <div key={log.id}>
                    <strong className={`audit-action audit-${log.action}`}>
                        {log.description}
                    </strong>
                    <p>
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </p>
                </div>
            ))}
            {!loading && total > 0 && (
                <div className="audit-pagination">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(current => current - 1)}
                    >
                        Anterior
                    </button>

                    <span>
                        Página {page} de {totalPages}
                    </span>

                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(current => current + 1)}
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
}

export default Audit;