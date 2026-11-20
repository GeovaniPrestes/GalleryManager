import { useEffect, useState } from "react";

interface Model {
    id: number;
    name: string;
    description: string | null;
    thumbnailPath: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface ModelsProps {
    editingEnabled: boolean;
    onSelectModel: (model: Model) => void;
}

function Models({ editingEnabled, onSelectModel }: ModelsProps) {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [folderPath, setFolderPath] = useState("");
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [editingModel, setEditingModel] = useState<Model | null>(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);

    useEffect(() => {
        async function loadModels() {
            try {
                const result = await window.electronAPI.listModels();
                setModels(result);
            } catch (error) {
                console.error("Erro ao carregar modelos:", error);
            } finally {
                setLoading(false);
            }
        }

        loadModels();
    }, []);

    async function handleSelectFolder() {
        try {
            const selectedFolder = await window.electronAPI.selectModelFolder();

            if (selectedFolder) {
                setFolderPath(selectedFolder);
            }
        } catch (error) {
            console.error("Erro ao selecionar pasta:", error);
            alert("Não foi possível selecionar a pasta.");
        }
    }

    async function handleSelectThumbnail() {
        try {
            const selectedImage = await window.electronAPI.selectModelThumbnail();

            if (selectedImage) {
                setSelectedThumbnail(selectedImage);
            }
        } catch (error) {
            console.error("Erro ao selecionar thumbnail:", error);
            alert("Não foi possível selecionar a imagem.");
        }
    }

    async function handleCreateModel() {
        if (!name.trim()) {
            alert("O nome do modelo é obrigatório.");
            return;
        }

        try {
            setSaving(true);

            await window.electronAPI.createModel({
                name: name.trim(),
                description: description.trim(),
                folderPath: folderPath.trim(),
                selectedThumbnail: selectedThumbnail?.trim() || null,
            });

            const updatedModels = await window.electronAPI.listModels();
            setModels(updatedModels);

            setName("");
            setDescription("");
            setFolderPath("");
            setSelectedThumbnail(null);
            setShowForm(false);
        } catch (error) {
            console.error("Erro ao cadastrar modelo:", error);
            alert("Não foi possível cadastrar o modelo.");
        } finally {
            setSaving(false);
        }
    }

    async function handleUpdateModel() {
        if (!editingModel) return;

        if (!name.trim()) {
            alert("O nome do modelo é obrigatório.");
            return;
        }

        try {
            setSaving(true);

            await window.electronAPI.updateModel({
                id: editingModel.id,
                name: name.trim(),
                description: description.trim(),
                folderPath: folderPath.trim(),
                selectedThumbnail: selectedThumbnail?.trim() || null,
            });

            const updatedModels = await window.electronAPI.listModels();
            setModels(updatedModels);

            setName("");
            setDescription("");
            setFolderPath("");
            setSelectedThumbnail(null);
            setEditingModel(null);
            setShowForm(false);
        } catch (error) {
            console.error("Erro ao atualizar modelo:", error);
            alert("Não foi possível atualizar o modelo.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteModel(model: Model) {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir o modelo "${model.name}"?`
        );

        if (!confirmed) return;

        try {
            await window.electronAPI.deleteModel(model.id);

            const updatedModels = await window.electronAPI.listModels();
            setModels(updatedModels);
        } catch (error) {
            console.error("Erro ao excluir modelo:", error);
            alert("Não foi possível excluir o modelo.");
        }
    }

    const filteredModels = models.filter((model) =>
        model.name.toLowerCase().includes(search.toLowerCase())
    );

    function handleEditModel(model: Model) {
        setEditingModel(model);
        setName(model.name);
        setDescription(model.description || "");
        setFolderPath("");
        setSelectedThumbnail(model.thumbnailPath);
        setShowForm(true);
    }

    function handleCloseForm() {
        setShowForm(false);
        setEditingModel(null);
        setName("");
        setDescription("");
        setFolderPath("");
        setSelectedThumbnail(null);
    }

    return (
        <div className="models-page">
            <div className="page-heading">
                <div>
                    <h1>Modelos</h1>
                    <p>Gerencie os modelos da sua biblioteca.</p>
                </div>

                {editingEnabled && (
                    <button
                        className="primary-button"
                        onClick={() => setShowForm(true)}
                    >
                        + Novo modelo
                    </button>
                )}
            </div>

            {showForm && editingEnabled && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingModel ? "Editar modelo" : "Novo modelo"}</h2>

                            <button
                                className="modal-close"
                                onClick={handleCloseForm}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <input
                                type="text"
                                placeholder="Digite o nome..."
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                            />

                            <label>Descrição</label>
                            <textarea
                                placeholder="Descrição opcional..."
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                            />

                            <label>Pasta do modelo</label>

                            <div className="folder-selection">
                                <input
                                    type="text"
                                    value={folderPath}
                                    placeholder="Selecione a pasta do modelo..."
                                    readOnly
                                />

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={handleSelectFolder}
                                >
                                    Selecionar pasta
                                </button>
                            </div>

                            <label>Thumbnail do modelo</label>

                            <div className="folder-selection">
                                <input
                                    type="text"
                                    value={selectedThumbnail ?? ""}
                                    placeholder="Thumbnail automática"
                                    readOnly
                                />

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={handleSelectThumbnail}
                                >
                                    Escolher imagem
                                </button>
                            </div>

                            {selectedThumbnail && (
                                <div className="model-thumbnail-preview">
                                    <img
                                        src={`preview://image?path=${encodeURIComponent(selectedThumbnail)}`}
                                        alt="Prévia da thumbnail"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="secondary-button"
                                onClick={handleCloseForm}
                            >
                                Cancelar
                            </button>

                            <button
                                className="primary-button"
                                onClick={editingModel ? handleUpdateModel : handleCreateModel}
                                disabled={saving}
                            >
                                {saving
                                    ? "Salvando..."
                                    : editingModel
                                        ? "Salvar alterações"
                                        : "Salvar modelo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="models-toolbar">
                <input
                    type="text"
                    className="models-search"
                    placeholder="Pesquisar modelos..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />

                <span>
                    {filteredModels.length} de {models.length} modelos
                </span>
            </div>

            {loading ? (
                <p>Carregando modelos...</p>
            ) : filteredModels.length === 0 ? (
                <div className="empty-state">
                    <h3>Nenhum modelo cadastrado</h3>
                    <p>Adicione seu primeiro modelo à biblioteca.</p>
                </div>
            ) : (
                <div className="models-grid">
                    {filteredModels.map((model) => (
                        <div className="model-card" key={model.id}>
                            <div
                                className="model-thumbnail"
                                onClick={() => onSelectModel(model)}
                                style={{ cursor: "pointer" }}
                            >
                                {model.thumbnailPath ? (
                                    <img
                                        src={`media://thumbnail?path=${encodeURIComponent(model.thumbnailPath)}`}
                                        alt={model.name}
                                        onError={() => {
                                            console.error("Erro ao carregar thumbnail:", {
                                                name: model.name,
                                                path: model.thumbnailPath
                                            });
                                        }}
                                    />
                                ) : (
                                    <span>SEM THUMBNAIL</span>
                                )}
                            </div>

                            <div className="model-info">
                                <h3>{model.name}</h3>

                                <p>
                                    {model.description || "Sem descrição"}
                                </p>

                                <button
                                    className="primary-button"
                                    onClick={() => onSelectModel(model)}
                                >
                                    Ver Sets
                                </button>

                                {editingEnabled && (
                                    <>
                                        <button
                                            className="secondary-button"
                                            onClick={() => handleEditModel(model)}
                                        >
                                            Editar
                                        </button>

                                        <button
                                            className="delete-button"
                                            onClick={() => handleDeleteModel(model)}
                                        >
                                            Excluir
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Models;
