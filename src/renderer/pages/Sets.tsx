import { useEffect, useState } from "react";
import type { SetRecord } from "../electron";

function Sets() {
    const [sets, setSets] = useState<SetRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [folderPath, setFolderPath] = useState("");

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadSets() {
            try {
                const result = await window.electronAPI.listSets();
                setSets(result);
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

            await window.electronAPI.createSet({
                name: name.trim(),
                description: description.trim(),
                folderPath
            });

            const updatedSets = await window.electronAPI.listSets();
            setSets(updatedSets);

            setName("");
            setDescription("");
            setFolderPath("");
            setShowForm(false);

        } catch (error) {
            console.error("Erro ao cadastrar set:", error);
            alert("Não foi possível cadastrar o set. Verifique se essa pasta já está cadastrada.");

        } finally {
            setSaving(false);
        }
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

                                <span className="set-folder">
                                    {gallerySet.folderPath}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Novo set</h2>

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
                                {saving ? "Salvando..." : "Salvar set"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Sets;
