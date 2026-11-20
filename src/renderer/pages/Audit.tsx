import { useEffect, useState } from "react";

function Audit() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadLogs() {
            try {
                setLoading(true);

                const result = await window.electronAPI.listAuditLogs({
                    limit: 50,
                    offset: 0
                });

                setLogs(result.logs);
            } catch (error) {
                console.error("Erro ao carregar auditoria:", error);
                setError("Não foi possível carregar o histórico.");
            } finally {
                setLoading(false);
            }
        }

        loadLogs();
    }, []);

    return (
        <div>
            <h1>Histórico de atividades</h1>

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
        </div>
    );
}

export default Audit;