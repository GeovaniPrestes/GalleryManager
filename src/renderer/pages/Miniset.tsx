import { useEffect, useState } from "react";

interface MinisetsProps {
    setId: number;
    setName: string;
    onBackToSets: () => void;
}

interface MinisetRecord {
    id: number;
    name: string;
    folderPath: string;
    parentId: number | null;
    setId: number;
    thumbnailPath: string | null;
    createdAt: Date;
    updatedAt: Date;
}

function Minisets({ setId, setName, onBackToSets }: MinisetsProps) {
    const [minisets, setMinisets] = useState<MinisetRecord[]>([]);
    const [navigationPath, setNavigationPath] = useState<MinisetRecord[]>([]);

    const currentParent = navigationPath.length > 0
        ? navigationPath[navigationPath.length - 1]
        : null;
    const [loading, setLoading] = useState(true);

    async function loadMinisets(parentId: number | null) {
        try {
            setLoading(true);

            const result = await window.electronAPI.listMinisets({
                setId,
                parentId
            });

            setMinisets(result);
        } catch (error) {
            console.error("Erro ao carregar Minisets:", error);
            alert("Não foi possível carregar os Minisets.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setNavigationPath([]);
        loadMinisets(null);
    }, [setId]);

    function handleBack() {
        if (navigationPath.length === 0) return;

        const newPath = navigationPath.slice(0, -1);

        setNavigationPath(newPath);

        const parentId = newPath.length > 0
            ? newPath[newPath.length - 1].id
            : null;

        loadMinisets(parentId);
    }

    function handleOpenMiniset(miniset: MinisetRecord) {
        setNavigationPath((current) => [...current, miniset]);
        loadMinisets(miniset.id);
    }

    return (
        <div className="minisets-page">
            <div className="page-heading">
                <div>
                    <h1>{setName}</h1>
                    <p>Explore os Minisets deste Set.</p>
                </div>

                <button
                    className="secondary-button"
                    onClick={handleBack}
                    disabled={!currentParent}
                >
                    Voltar
                </button>
                <button
                    className="secondary-button"
                    onClick={onBackToSets}
                >
                    Voltar aos Sets
                </button>
            </div>

            {loading ? (
                <p>Carregando Minisets...</p>
            ) : minisets.length === 0 ? (
                <div className="empty-state">
                    <h3>Nenhuma subpasta encontrada</h3>
                    <p>Este nível não possui Minisets cadastrados.</p>
                </div>
            ) : (
                <div className="sets-grid">
                    {minisets.map((miniset) => (
                        <div
                            className="set-card"
                            key={miniset.id}
                            onDoubleClick={() => handleOpenMiniset(miniset)}
                        >
                            <div className="set-thumbnail">
                                {miniset.thumbnailPath ? (
                                    <img
                                        src={`media://thumbnail?path=${encodeURIComponent(miniset.thumbnailPath)}`}
                                        alt={miniset.name}
                                    />
                                ) : (
                                    <span>SEM THUMBNAIL</span>
                                )}
                            </div>

                            <div className="set-info">
                                <h3>{miniset.name}</h3>
                                <span className="set-folder">
                                    {miniset.folderPath}
                                </span>

                                <button
                                    className="secondary-button"
                                    onClick={() => handleOpenMiniset(miniset)}
                                >
                                    Abrir pasta
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Minisets;
