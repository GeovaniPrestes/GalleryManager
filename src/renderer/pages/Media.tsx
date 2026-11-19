import { useEffect, useState } from "react";

function Media() {
    const [media, setMedia] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

        } catch (error) {
            console.error("Erro ao carregar mídias:", error);
            setError("Não foi possível carregar as mídias.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadMedia();
    }, []);

    return (
        <div className="media-page">
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
                        {media.map((item) => (
                            <div className="media-card" key={item.id}>
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
                </>
            )}
        </div>
    );
}

export default Media;