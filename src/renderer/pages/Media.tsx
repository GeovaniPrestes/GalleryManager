import { useEffect, useState } from "react";

function Media() {
    const [media, setMedia] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
    const [mediaFilter, setMediaFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const filteredMedia = media.filter(item => {
        if (mediaFilter === "all") return true;
        return item.mediaType === mediaFilter;
    });

    async function loadMedia() {
        try {
            setLoading(true);
            setError("");

            const result = await window.electronAPI.listMedia({
                limit: 100,
                offset: 0
            });

            setMedia(result.media);
            setTotal(result.total);

            setHasMore(result.media.length + 0 < result.total);

        } catch (error) {
            console.error("Erro ao carregar mídias:", error);
            setError("Não foi possível carregar as mídias.");
        } finally {
            setLoading(false);
        }
    }

    async function loadMore() {
        try {
            setLoadingMore(true);

            const result = await window.electronAPI.listMedia({
                limit: 100,
                offset: media.length
            });

            setMedia(previous => [...previous, ...result.media]);
            setHasMore(media.length + result.media.length < total);

        } catch (error) {
            console.error("Erro ao carregar mais mídias:", error);
        } finally {
            setLoadingMore(false);
        }
    }

    function navigateMedia(direction: number) {
        if (selectedIndex === null) return;

        const nextIndex = selectedIndex + direction;

        if (nextIndex < 0 || nextIndex >= filteredMedia.length) return;

        setSelectedIndex(nextIndex);
        setSelectedMedia(filteredMedia[nextIndex]);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }

    useEffect(() => {
        loadMedia();
    }, []);

    useEffect(() => {
        if (!selectedMedia) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setSelectedMedia(null);
                setSelectedIndex(null);
                setZoom(1);
            }

            if (event.key === "ArrowLeft") {
                navigateMedia(-1);
            }

            if (event.key === "ArrowRight") {
                navigateMedia(1);
            }

            if (event.key === "0") {
                setZoom(1);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedMedia, selectedIndex, media]);

    return (
        <div className="media-page">
            <div className="media-filters">
                <button
                    className={mediaFilter === "all" ? "active" : ""}
                    onClick={() => setMediaFilter("all")}
                >
                    Todas
                </button>

                <button
                    className={mediaFilter === "image" ? "active" : ""}
                    onClick={() => setMediaFilter("image")}
                >
                    Imagens
                </button>

                <button
                    className={mediaFilter === "video" ? "active" : ""}
                    onClick={() => setMediaFilter("video")}
                >
                    Vídeos
                </button>
            </div>
            <div className="page-heading">
                <div>
                    <h1>Mídias</h1>
                    <p>Explore as imagens e vídeos da sua biblioteca.</p>
                </div>
            </div>
            {loading ? (
                <p>Carregando mídias...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : media.length === 0 ? (
                <p>Nenhuma mídia encontrada. Indexe um Set para começar.</p>
            ) : (
                <>
                    <p>{total} mídias encontradas.</p>

                    <div className="media-grid">
                        {filteredMedia.map((item) => (
                            <div
                                className="media-card"
                                key={item.id}
                                onClick={() => {
                                    setSelectedIndex(filteredMedia.findIndex(m => m.id === item.id));
                                    setSelectedMedia(item);
                                    setZoom(1);
                                    setPosition({ x: 0, y: 0 });
                                    setDragging(false);
                                }}
                            >
                                {item.thumbnailPath ? (
                                    <img
                                        src={`media://thumbnail?path=${encodeURIComponent(item.thumbnailPath)}`}
                                        alt="Miniatura da mídia"
                                        onLoad={() => console.log("Thumbnail carregada:", item.id)}
                                        onError={() => console.error("Erro ao carregar thumbnail:", item.id, item.thumbnailPath)}
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
                    {hasMore && (
                        <button
                            type="button"
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? "Carregando..." : "Carregar mais"}
                        </button>
                    )}
                </>
            )}
            {selectedMedia && (
                <div
                    className="media-viewer"
                    onClick={() => setSelectedMedia(null)}
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
                        className="media-viewer-close"
                        onClick={() => {
                            setSelectedMedia(null);
                            setSelectedIndex(null);
                            setZoom(1);
                        }}
                    >
                        ×
                    </button>
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
                        {selectedIndex !== null ? selectedIndex + 1 : 0} de {filteredMedia.length}
                    </div>

                    <button
                        className="media-viewer-next"
                        onClick={(event) => {
                            event.stopPropagation();
                            navigateMedia(1);
                        }}
                        disabled={selectedIndex === filteredMedia.length - 1}
                    >
                        ❯
                    </button>
                    <div className="media-viewer-zoom">
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                setZoom(previous => Math.max(0.5, previous - 0.25));
                            }}
                        >
                            −
                        </button>

                        <span>{Math.round(zoom * 100)}%</span>

                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                setZoom(previous => Math.min(4, previous + 0.25));
                            }}
                        >
                            +
                        </button>

                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                setZoom(1);
                            }}
                        >
                            Ajustar
                        </button>
                    </div>
                    {selectedMedia.mediaType === "video" ? (
                        <video
                            src={`preview://image?path=${encodeURIComponent(selectedMedia.locations[0].filePath)}`}
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
                            src={`preview://image?path=${encodeURIComponent(selectedMedia.locations[0].filePath)}`}
                            alt={selectedMedia.locations[0].fileName}
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                transition: dragging ? "none" : "transform 0.2s ease",
                                cursor: zoom > 1 ? dragging ? "grabbing" : "grab" : "default"
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onWheel={(event) => {
                                event.stopPropagation();
                                setZoom(previous => {
                                    const change = event.deltaY < 0 ? 0.25 : -0.25;
                                    return Math.min(4, Math.max(0.5, previous + change));
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

export default Media;