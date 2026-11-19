import { useEffect, useState } from "react";
import type { SetRecord } from "../electron";
import type { ModelRecord } from "../electron";

function Sets() {
    const [sets, setSets] = useState<SetRecord[]>([]);
    const [models, setModels] = useState<ModelRecord[]>([]);
    const [selectedModels, setSelectedModels] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [folderPath, setFolderPath] = useState("");

    const [saving, setSaving] = useState(false);
    const [editingSet, setEditingSet] = useState<SetRecord | null>(null);

    useEffect(() => {
        async function loadSets() {
            try {
                const [setsResult, modelsResult] = await Promise.all([
                    window.electronAPI.listSets(),
                    window.electronAPI.listModels()
                ]);

                setSets(setsResult);
                setModels(modelsResult);
            } catch (error) {
                console.error("Erro ao carregar sets:", error);
            } finally {
                setLoading(false);
            }
        }

        loadSets();
    }, []);

    async function handleCreateSet() {
        if (!name.trim()) {
            alert("O nome do set é obrigatório.");
            return;
        }

        if (!folderPath) {
            alert("Selecione a pasta do set.");
            return;
        }

        try {
            setSaving(true);

            if (editingSet) {
                await window.electronAPI.updateSet({
                    id: editingSet.id,
                    name: name.trim(),
                    description: description.trim(),
                    folderPath,
                    modelIds: selectedModels
                });
            } else {
                await window.electronAPI.createSet({
                    name: name.trim(),
                    description: description.trim(),
                    folderPath,
                    modelIds: selectedModels
                });
            }

            const updatedSets = await window.electronAPI.listSets();
            setSets(updatedSets);

            setName("");
            setDescription("");
            setFolderPath("");
            setSelectedModels([]);
            setShowForm(false);
            setEditingSet(null);

        } catch (error) {
            console.error("Erro ao cadastrar set:", error);
            alert("Não foi possível cadastrar o set. Verifique se essa pasta já está cadastrada.");

        } finally {
            setSaving(false);
        }
    }

    function handleEditSet(gallerySet: SetRecord) {
        setEditingSet(gallerySet);

        setName(gallerySet.name);
        setDescription(gallerySet.description || "");
        setFolderPath(gallerySet.folderPath);

        setSelectedModels(
            gallerySet.models.map((model) => model.id)
        );

        setShowForm(true);
    }

    async function handleDeleteSet(gallerySet: SetRecord) {
        const confirmed = window.confirm(
            `Tem certeza que deseja excluir o Set "${gallerySet.name}"?\n\nA pasta e os arquivos originais não serão apagados.`
        );

        if (!confirmed) return;

        try {
            await window.electronAPI.deleteSet(gallerySet.id);

            const updatedSets = await window.electronAPI.listSets();
            setSets(updatedSets);

        } catch (error) {
            console.error("Erro ao excluir Set:", error);
            alert("Não foi possível excluir o Set.");
        }
    }

    function handleToggleModel(modelId: number) {
        setSelectedModels((current) => {
            if (current.includes(modelId)) {
                return current.filter((id) => id !== modelId);
            }

            return [...current, modelId];
        });
    }

    return (
        <div className="sets-page">
            <div className="page-heading">
                <div>
                    <h1>Sets</h1>
                    <p>Gerencie os sets da sua biblioteca.</p>
                </div>

                <button
                    className="primary-button"
                    onClick={() => setShowForm(true)}
                >
                    + Novo set
                </button>
            </div>

            <div className="sets-toolbar">
                <span>
                    {sets.length} sets cadastrados
                </span>
            </div>

            {loading ? (
                <p>Carregando sets...</p>
            ) : sets.length === 0 ? (
                <div className="empty-state">
                    <h3>Nenhum set cadastrado</h3>
                    <p>Adicione seu primeiro set à biblioteca.</p>
                </div>
            ) : (
                <div className="sets-grid">
                    {sets.map((gallerySet) => (
                        <div className="set-card" key={gallerySet.id}>
                            <div className="set-thumbnail">
                                <span>SEM THUMBNAIL</span>
                            </div>

                            <div className="set-info">
                                <h3>{gallerySet.name}</h3>

                                <p>
                                    {gallerySet.description || "Sem descrição"}
                                </p>
                                <div className="set-models">
                                    <span>Modelos participantes:</span>

                                    {gallerySet.models.length === 0 ? (
                                        <p>Nenhum modelo associado</p>
                                    ) : (
                                        <p>
                                            {gallerySet.models.map((model) => model.name).join(", ")}
                                        </p>
                                    )}
                                </div>
                                <span className="set-folder">
                                    {gallerySet.folderPath}
                                </span>
                                <button
                                    className="secondary-button"
                                    onClick={() => handleEditSet(gallerySet)}
                                >
                                    Editar
                                </button>
                                <button
                                    className="delete-button"
                                    onClick={() => handleDeleteSet(gallerySet)}
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingSet ? "Editar set" : "Novo set"}</h2>

                            <button
                                className="modal-close"
                                onClick={() => setShowForm(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <label>Nome do set</label>
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

                            <label>Pasta do set</label>
                            <input
                                type="text"
                                placeholder="Selecione uma pasta..."
                                value={folderPath}
                                readOnly
                            />

                            <button
                                className="secondary-button"
                                onClick={async () => {
                                    const selectedFolder =
                                        await window.electronAPI.selectSetFolder();

                                    if (selectedFolder) {
                                        setFolderPath(selectedFolder);
                                    }
                                }}
                            >
                                Selecionar pasta
                            </button>
                        </div>


                        <label>Modelos participantes</label>

                        <div className="model-selection-list">
                            {models.length === 0 ? (
                                <p>Nenhum modelo cadastrado.</p>
                            ) : (
                                models.map((model) => (
                                    <label
                                        className="model-selection-item"
                                        key={model.id}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedModels.includes(model.id)}
                                            onChange={() => handleToggleModel(model.id)}
                                        />

                                        <span>{model.name}</span>
                                    </label>
                                ))
                            )}
                        </div>

                        <p className="selection-count">
                            {selectedModels.length} modelo(s) selecionado(s)
                        </p>


                        <div className="modal-footer">
                            <button
                                className="secondary-button"
                                onClick={() => setShowForm(false)}
                            >
                                Cancelar
                            </button>

                            <button
                                className="primary-button"
                                onClick={handleCreateSet}
                                disabled={saving}
                            >
                                {saving
                                    ? "Salvando..."
                                    : editingSet
                                        ? "Salvar alterações"
                                        : "Salvar set"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Sets;
