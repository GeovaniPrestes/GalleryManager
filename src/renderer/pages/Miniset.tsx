import { useEffect, useState } from "react";
import type { MinisetRecord, SetMediaRecord } from "../electron";

interface MinisetsProps {
    setId: number;
    setName: string;
    mediaIndexStatus: "pending" | "indexing" | "indexed" | "error";
    onBackToSets: () => void;
    onSetUpdated: () => Promise<void>;
}

interface MinisetNode extends MinisetRecord {
    children: MinisetNode[];
}

type MediaLocation = SetMediaRecord["locations"][number];

interface GalleryMediaItem extends SetMediaRecord {
    location: MediaLocation;
}

function Minisets({
    setId,
    setName,
    mediaIndexStatus,
    onSetUpdated,
    onBackToSets
}: MinisetsProps) {
    const [minisets, setMinisets] = useState<MinisetNode[]>([]);
    const [media, setMedia] = useState<SetMediaRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedMedia, setSelectedMedia] =
        useState<GalleryMediaItem | null>(null);

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
    const [showMediaInfo, setShowMediaInfo] = useState(false);

    async function loadMinisetTree(
        parentId: number | null
    ): Promise<MinisetNode[]> {
        const children = await window.electronAPI.listMinisets({
            setId,
            parentId
        });

        return Promise.all(
            children.map(async (miniset) => ({
                ...miniset,
                children: await loadMinisetTree(miniset.id)
            }))
        );
    }

    async function loadGallery() {
        try {
            setLoading(true);
            setError("");

            const [minisetTree, mediaResult] = await Promise.all([
                loadMinisetTree(null),
                window.electronAPI.listSetMedia(setId)
            ]);

            setMinisets(minisetTree);
            setMedia(mediaResult);
        } catch (error) {
            console.error("Erro ao carregar galeria do Set:", error);
            setError("Não foi possível carregar a galeria deste Set.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function initializeGallery() {
            try {
                setLoading(true);
                setError("");

                if (mediaIndexStatus === "pending") {
                    await window.electronAPI.indexSetMedia(setId);
                    await onSetUpdated();
                }

                if (cancelled) return;

                const [minisetTree, mediaResult] = await Promise.all([
                    loadMinisetTree(null),
                    window.electronAPI.listSetMedia(setId)
                ]);

                if (cancelled) return;

                setMinisets(minisetTree);
                setMedia(mediaResult);
            } catch (error) {
                console.error("Erro ao inicializar galeria:", error);
                if (!cancelled) {
                    setError(
                        "Não foi possível carregar a galeria deste Set."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        initializeGallery();

        return () => {
            cancelled = true;
        };
    }, [setId, mediaIndexStatus]);

    function getMediaFromLocations(
        minisetId: number | null
    ): GalleryMediaItem[] {
        return media.flatMap((item) =>
            item.locations
                .filter((location) =>
                    minisetId === null
                        ? location.miniset === null
                        : location.miniset?.id === minisetId
                )
                .map((location) => ({
                    ...item,
                    location
                }))
        );
    }

    function flattenMinisetMedia(
        nodes: MinisetNode[]
    ): GalleryMediaItem[] {
        return nodes.flatMap((node) => [
            ...getMediaFromLocations(node.id),
            ...flattenMinisetMedia(node.children)
        ]);
    }

    const rootMedia = getMediaFromLocations(null);

    const allMedia = [
        ...rootMedia,
        ...flattenMinisetMedia(minisets)
    ];

    function openMedia(item: GalleryMediaItem) {
        const index = allMedia.findIndex(
            (mediaItem) =>
                mediaItem.id === item.id &&
                mediaItem.location.id === item.location.id
        );

        if (index === -1) return;

        setSelectedIndex(index);
        setSelectedMedia(allMedia[index]);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setDragging(false);
        setShowMediaInfo(false);
    }

    function navigateMedia(direction: number) {
        if (selectedIndex === null) return;

        const nextIndex = selectedIndex + direction;

        if (nextIndex < 0 || nextIndex >= allMedia.length) return;

        setSelectedIndex(nextIndex);
        setSelectedMedia(allMedia[nextIndex]);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setDragging(false);
        setShowMediaInfo(false);
    }

    function closeViewer() {
        setSelectedMedia(null);
        setSelectedIndex(null);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setDragging(false);
        setShowMediaInfo(false);
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 B";

        const units = ["B", "KB", "MB", "GB", "TB"];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = bytes / Math.pow(1024, index);

        return `${size.toFixed(2)} ${units[index]}`;
    }

    useEffect(() => {
        if (!selectedMedia) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                closeViewer();
            }

            if (event.key === "ArrowLeft") {
                navigateMedia(-1);
            }

            if (event.key === "ArrowRight") {
                navigateMedia(1);
            }

            if (event.key === "0") {
                setZoom(1);
                setPosition({ x: 0, y: 0 });
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedMedia, selectedIndex, media, minisets]);

    function renderMediaGrid(items: GalleryMediaItem[]) {
        if (items.length === 0) {
            return (
                <p className="empty-state">
                    Nenhuma mídia encontrada nesta pasta.
                </p>
            );
        }

        return (
            <div className="media-grid">
                {items.map((item, index) => (
                    <div
                        className="media-card"
                        key={`${item.id}-${item.location.id}-${index}`}
                        onClick={() => openMedia(item)}
                    >
                        {item.thumbnailPath ? (
                            <img
                                src={`media://thumbnail?path=${encodeURIComponent(
                                    item.thumbnailPath
                                )}`}
                                alt={item.location.fileName}
                            />
                        ) : (
                            <div className="media-placeholder">
                                {item.mediaType === "video"
                                    ? "Vídeo"
                                    : "Sem miniatura"}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    function renderMiniset(node: MinisetNode) {
        const minisetMedia = getMediaFromLocations(node.id);

        return (
            <details
                className="miniset-section"
                key={node.id}
            >
                <summary className="miniset-section-header">
                    <span className="miniset-section-title">
                        {node.name}
                    </span>

                    <span className="miniset-section-count">
                        {minisetMedia.length} mídias
                    </span>
                </summary>

                <div className="miniset-section-content">
                    {renderMediaGrid(minisetMedia)}

                    {node.children.length > 0 && (
                        <div className="miniset-children">
                            {node.children.map((child) =>
                                renderMiniset(child)
                            )}
                        </div>
                    )}
                </div>
            </details>
        );
    }

    return (
        <div className="minisets-page">
            <div className="page-heading">
                <div>
                    <h1>{setName}</h1>
                    <p>
                        Explore as imagens e vídeos deste Set.
                    </p>
                </div>

                <button
                    className="secondary-button"
                    onClick={onBackToSets}
                >
                    Voltar aos Sets
                </button>
            </div>

            {loading ? (
                <p>Carregando galeria...</p>
            ) : error ? (
                <div className="error-message">
                    <p>{error}</p>

                    <button
                        className="secondary-button"
                        onClick={loadGallery}
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : (
                <>
                    <div className="set-gallery-root">
                        <div className="miniset-section-header">
                            <h2>Arquivos da pasta principal</h2>
                            <span className="miniset-section-count">
                                {rootMedia.length} mídias
                            </span>
                        </div>

                        {renderMediaGrid(rootMedia)}
                    </div>

                    {minisets.length > 0 && (
                        <div className="set-minisets">
                            <h2>Subpastas</h2>

                            {minisets.map((miniset) =>
                                renderMiniset(miniset)
                            )}
                        </div>
                    )}

                    {rootMedia.length === 0 && minisets.length === 0 && (
                        <div className="empty-state">
                            <h3>Nenhuma mídia encontrada</h3>
                            <p>
                                Este Set ainda não possui mídias ou
                                subpastas indexadas.
                            </p>
                        </div>
                    )}
                </>
            )}

            {selectedMedia && (
                <div
                    className="media-viewer"
                    onClick={closeViewer}
                    onMouseMove={(event) => {
                        if (!dragging) return;

                        setPosition({
                            x: event.clientX - dragOrigin.x,
                            y: event.clientY - dragOrigin.y
                        });
                    }}
                    onMouseUp={() => setDragging(false)}
                    onMouseLeave={() => setDragging(false)}
                >
                    <button
                        className="media-viewer-info-button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setShowMediaInfo((previous) => !previous);
                        }}
                        title="Informações da mídia"
                    >
                        ⓘ
                    </button>

                    <button
                        className="media-viewer-close"
                        onClick={(event) => {
                            event.stopPropagation();
                            closeViewer();
                        }}
                    >
                        ×
                    </button>

                    {showMediaInfo && (
                        <div
                            className="media-info-panel"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="media-info-header">
                                <h3>Informações da mídia</h3>

                                <button
                                    onClick={() => setShowMediaInfo(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="media-info-content">
                                <div>
                                    <label>Nome do arquivo</label>
                                    <p>{selectedMedia.location.fileName}</p>
                                </div>

                                <div>
                                    <label>Tipo</label>
                                    <p>{selectedMedia.mediaType}</p>
                                </div>

                                <div>
                                    <label>Extensão</label>
                                    <p>{selectedMedia.location.extension}</p>
                                </div>

                                <div>
                                    <label>Tamanho</label>
                                    <p>
                                        {formatFileSize(
                                            Number(selectedMedia.location.fileSize)
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <label>Set</label>
                                    <p>{setName}</p>
                                </div>

                                <div>
                                    <label>Miniset</label>
                                    <p>
                                        {selectedMedia.location.miniset?.name ||
                                            "Raiz do Set"}
                                    </p>
                                </div>

                                <div>
                                    <label>Caminho original</label>
                                    <p className="media-info-path">
                                        {selectedMedia.location.filePath}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        className="media-viewer-prev"
                        onClick={(event) => {
                            event.stopPropagation();
                            navigateMedia(-1);
                        }}
                        disabled={selectedIndex === 0}
                    >
                        ❮
                    </button>

                    <div className="media-viewer-counter">
                        {selectedIndex !== null ? selectedIndex + 1 : 0}
                        {" de "}
                        {allMedia.length}
                    </div>

                    <button
                        className="media-viewer-next"
                        onClick={(event) => {
                            event.stopPropagation();
                            navigateMedia(1);
                        }}
                        disabled={selectedIndex === allMedia.length - 1}
                    >
                        ❯
                    </button>

                    <div className="media-viewer-zoom">
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                setZoom((previous) =>
                                    Math.max(0.5, previous - 0.25)
                                );
                            }}
                        >
                            −
                        </button>

                        <span>{Math.round(zoom * 100)}%</span>

                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                setZoom((previous) =>
                                    Math.min(4, previous + 0.25)
                                );
                            }}
                        >
                            +
                        </button>

                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                setZoom(1);
                                setPosition({ x: 0, y: 0 });
                            }}
                        >
                            Ajustar
                        </button>
                    </div>

                    {selectedMedia.mediaType === "video" ? (
                        <video
                            src={`preview://image?path=${encodeURIComponent(
                                selectedMedia.location.filePath
                            )}`}
                            controls
                            autoPlay
                            onClick={(event) => event.stopPropagation()}
                            style={{
                                maxWidth: "90%",
                                maxHeight: "90%",
                                objectFit: "contain"
                            }}
                        />
                    ) : (
                        <img
                            src={`preview://image?path=${encodeURIComponent(
                                selectedMedia.location.filePath
                            )}`}
                            alt={selectedMedia.location.fileName}
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                transition: dragging
                                    ? "none"
                                    : "transform 0.2s ease",
                                cursor:
                                    zoom > 1
                                        ? dragging
                                            ? "grabbing"
                                            : "grab"
                                        : "default"
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onWheel={(event) => {
                                event.stopPropagation();

                                setZoom((previous) => {
                                    const change =
                                        event.deltaY < 0 ? 0.25 : -0.25;

                                    return Math.min(
                                        4,
                                        Math.max(0.5, previous + change)
                                    );
                                });
                            }}
                            onMouseDown={(event) => {
                                if (zoom <= 1) return;

                                event.preventDefault();
                                setDragging(true);

                                setDragOrigin({
                                    x: event.clientX - position.x,
                                    y: event.clientY - position.y
                                });
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default Minisets;
