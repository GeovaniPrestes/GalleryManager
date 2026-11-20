import { useEffect, useState } from "react";
import type { SetRecord } from "../electron";
import type { ModelRecord } from "../electron";

interface SetsProps {
    onOpenSet: (gallerySet: SetRecord) => void;
}

function Sets({ onOpenSet }: SetsProps) {
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
    const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
    const [indexingSetId, setIndexingSetId] = useState<number | null>(null);

    const [showAutoForm, setShowAutoForm] = useState(false);
    const [autoSelectedModelId, setAutoSelectedModelId] = useState<number | "">("");
    const [scannedSetFolders, setScannedSetFolders] = useState<Array<{
        name: string;
        folderPath: string;
        alreadyRegistered: boolean;
    }>>([]);

    const [selectedAutoFolders, setSelectedAutoFolders] = useState<string[]>([]);

    const [scanning, setScanning] = useState(false);

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

    useEffect(() => {
        loadSets();
    }, []);

    const handleSelectThumbnail = async () => {
        const path = await window.electronAPI.selectSetThumbnail(folderPath);

        if (path) {
            setSelectedThumbnail(path);
        }
    };

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
                    modelIds: selectedModels,
                    selectedThumbnail
                });
            } else {
                await window.electronAPI.createSet({
                    name: name.trim(),
                    description: description.trim(),
                    folderPath,
                    modelIds: selectedModels,
                    selectedThumbnail
                });
            }

            const updatedSets = await window.electronAPI.listSets();
            setSets(updatedSets);

            setName("");
            setDescription("");
            setFolderPath("");
            setSelectedModels([]);
            setSelectedThumbnail(null);
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

        setSelectedThumbnail(null);
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

    async function handleScanMinisets(gallerySet: SetRecord) {
        try {
            const result = await window.electronAPI.scanMinisets(
                gallerySet.id
            );

            alert(
                `Indexação concluída!\n${result.total} Miniset(s) encontrado(s).`
            );

        } catch (error) {
            console.error("Erro ao indexar Minisets:", error);
            alert("Não foi possível indexar as subpastas deste Set.");
        }
    }

    async function handleIndexMedia(gallerySet: SetRecord) {
        try {
            setIndexingSetId(gallerySet.id);

            const result = await window.electronAPI.indexSetMedia(
                gallerySet.id
            );

            alert(
                `Indexação de mídias concluída!\n\n` +
                `Arquivos encontrados: ${result.totalFiles}\n` +
                `Novas mídias: ${result.newMedia}\n` +
                `Novas localizações: ${result.newLocations}\n` +
                `Mídias existentes: ${result.existingMedia}\n` +
                `Erros: ${result.errors}`
            );

        } catch (error) {
            console.error("Erro ao indexar mídias:", error);
            alert("Não foi possível indexar as mídias deste Set.");
        } finally {
            setIndexingSetId(null);
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

    async function handleScanModelFolders() {
        if (!autoSelectedModelId) {
            alert("Selecione um Modelo.");
            return;
        }

        try {
            setScanning(true);

            const result = await window.electronAPI.scanModelSetFolders(
                autoSelectedModelId
            );

            const folders = result.map((folder) => ({
                ...folder,
                name: folder.name
                    .replace(/[^\p{L}\p{N}\s]/gu, " ")
                    .replace(/\s+/g, " ")
                    .trim()
            }));

            setScannedSetFolders(folders);

            setSelectedAutoFolders(
                folders
                    .filter((folder) => !folder.alreadyRegistered)
                    .map((folder) => folder.folderPath)
            );

        } catch (error) {
            console.error("Erro ao analisar pastas do Modelo:", error);
            alert("Não foi possível analisar as pastas deste Modelo.");
        } finally {
            setScanning(false);
        }
    }

    async function handleCreateAutoSets() {
        const foldersToCreate = scannedSetFolders.filter(
            (folder) =>
                selectedAutoFolders.includes(folder.folderPath) &&
                !folder.alreadyRegistered
        );

        if (foldersToCreate.length === 0) {
            alert("Selecione pelo menos uma pasta para cadastrar.");
            return;
        }

        const invalidNames = foldersToCreate.some(
            (folder) => !folder.name.trim()
        );

        if (invalidNames) {
            alert("Todas as pastas precisam ter um nome válido.");
            return;
        }

        const confirmed = window.confirm(
            `Deseja cadastrar ${foldersToCreate.length} Set(s) no Modelo selecionado?`
        );

        if (!confirmed) return;

        let created = 0;

        try {
            setSaving(true);

            for (const folder of foldersToCreate) {
                await window.electronAPI.createSet({
                    name: folder.name.trim(),
                    description: "",
                    folderPath: folder.folderPath,
                    modelIds: [autoSelectedModelId as number],
                    selectedThumbnail: null
                });

                created++;
            }

            await loadSets();

            setShowAutoForm(false);
            setScannedSetFolders([]);
            setSelectedAutoFolders([]);
            setAutoSelectedModelId("");

            alert(`${created} Set(s) cadastrado(s) com sucesso!`);

        } catch (error) {
            console.error("Erro ao gerar Sets automaticamente:", error);

            await loadSets();

            alert(
                `O processo foi interrompido após cadastrar ${created} Set(s).\nVerifique os Sets cadastrados antes de tentar novamente.`
            );

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

                <div className="page-actions">
                    <button
                        className="secondary-button"
                        onClick={() => {
                            setAutoSelectedModelId("");
                            setScannedSetFolders([]);
                            setShowAutoForm(true);
                        }}
                    >
                        Gerar Sets automaticamente
                    </button>
                    <button
                        className="secondary-button"
                        onClick={async () => {
                            try {
                                const result = await window.electronAPI.generateMissingSetThumbnails();

                                alert(
                                    `Processo concluído!\nSets analisados: ${result.total}\nThumbnails geradas: ${result.generated}`
                                );
                                await loadSets();
                            } catch (error) {
                                console.error(error);
                                alert("Erro ao gerar thumbnails dos Sets.");
                            }
                        }}
                    >
                        Gerar thumbnails pendentes
                    </button>

                    <button
                        className="primary-button"
                        onClick={() => setShowForm(true)}
                    >
                        + Novo set
                    </button>
                </div>
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
                                {gallerySet.thumbnailPath ? (
                                    <img
                                        src={`media://thumbnail?path=${encodeURIComponent(gallerySet.thumbnailPath)}`}
                                        alt={gallerySet.name}
                                    />
                                ) : (
                                    <span>SEM THUMBNAIL</span>
                                )}
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
                                    className="primary-button"
                                    onClick={() => onOpenSet(gallerySet)}
                                >
                                    Abrir Set
                                </button>
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
                                <button
                                    className="secondary-button"
                                    onClick={() => handleScanMinisets(gallerySet)}
                                >
                                    Indexar subpastas
                                </button>
                                <button
                                    className="primary-button"
                                    onClick={() => handleIndexMedia(gallerySet)}
                                    disabled={indexingSetId !== null}
                                >
                                    {indexingSetId === gallerySet.id
                                        ? "Indexando mídias..."
                                        : "Indexar mídias"}
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
                                    const selectedModel = models.find(
                                        (model) => model.id === selectedModels[0]
                                    );

                                    const selectedFolder =
                                        await window.electronAPI.selectSetFolder(
                                            selectedModel?.folderPath ?? undefined
                                        );

                                    if (selectedFolder) {
                                        setFolderPath(selectedFolder);

                                        if (!name.trim()) {
                                            const folderName = selectedFolder
                                                .split(/[\\/]/)
                                                .filter(Boolean)
                                                .pop() || "";

                                            const sanitizedName = folderName
                                                .replace(/[^\p{L}\p{N}\s]/gu, " ")
                                                .replace(/\s+/g, " ")
                                                .trim();

                                            setName(sanitizedName);
                                        }
                                    }
                                }}
                            >
                                Selecionar pasta
                            </button>

                            <div className="form-group">
                                <label>Thumbnail do Set</label>

                                <button
                                    type="button"
                                    onClick={handleSelectThumbnail}
                                >
                                    Selecionar imagem
                                </button>

                                <small>
                                    {selectedThumbnail || "Thumbnail automática"}
                                </small>
                            </div>
                            {selectedThumbnail && (
                                <div className="model-thumbnail-preview">
                                    <img
                                        src={`preview://image?path=${encodeURIComponent(selectedThumbnail)}`}
                                        alt="Prévia da thumbnail do set"
                                    />
                                </div>
                            )}

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
                                onClick={() => setShowAutoForm(false)}
                                disabled={saving}
                            >
                                Fechar
                            </button>

                            <button
                                className="primary-button"
                                onClick={handleCreateAutoSets}
                                disabled={
                                    saving ||
                                    selectedAutoFolders.length === 0 ||
                                    scannedSetFolders.length === 0
                                }
                            >
                                {saving
                                    ? "Cadastrando..."
                                    : `Cadastrar ${selectedAutoFolders.length} Set(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showAutoForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Gerar Sets automaticamente</h2>

                            <button
                                className="modal-close"
                                onClick={() => setShowAutoForm(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <label>Selecione o Modelo</label>

                            <select
                                value={autoSelectedModelId}
                                onChange={(event) => {
                                    setAutoSelectedModelId(
                                        event.target.value ? Number(event.target.value) : ""
                                    );
                                    setScannedSetFolders([]);
                                    setSelectedAutoFolders([]);
                                }}
                            >
                                <option value="">Selecione um Modelo...</option>

                                {models.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                className="primary-button"
                                onClick={handleScanModelFolders}
                                disabled={!autoSelectedModelId || scanning}
                            >
                                {scanning
                                    ? "Analisando pastas..."
                                    : "Analisar subpastas"}
                            </button>

                            {scannedSetFolders.length > 0 && (
                                <div className="auto-set-list">
                                    <p>
                                        {scannedSetFolders.length} pasta(s) encontrada(s).
                                    </p>

                                    {scannedSetFolders.map((folder) => (
                                        <div
                                            className="auto-set-item"
                                            key={folder.folderPath}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAutoFolders.includes(folder.folderPath)}
                                                disabled={folder.alreadyRegistered}
                                                onChange={(event) => {
                                                    setSelectedAutoFolders((current) =>
                                                        event.target.checked
                                                            ? [...current, folder.folderPath]
                                                            : current.filter(
                                                                (path) => path !== folder.folderPath
                                                            )
                                                    );
                                                }}
                                            />

                                            <div>
                                                <input
                                                    type="text"
                                                    value={folder.name}
                                                    disabled={folder.alreadyRegistered}
                                                    onChange={(event) => {
                                                        setScannedSetFolders((current) =>
                                                            current.map((item) =>
                                                                item.folderPath === folder.folderPath
                                                                    ? { ...item, name: event.target.value }
                                                                    : item
                                                            )
                                                        );
                                                    }}
                                                />

                                                <small>{folder.folderPath}</small>
                                            </div>

                                            {folder.alreadyRegistered && (
                                                <span>Já cadastrado</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="primary-button"
                                onClick={handleCreateAutoSets}
                                disabled={
                                    saving ||
                                    selectedAutoFolders.length === 0 ||
                                    scannedSetFolders.length === 0
                                }
                            >
                                {saving ? "Cadastrando..." : `Cadastrar ${selectedAutoFolders.length} Set(s)`}
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => setShowAutoForm(false)}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}

export default Sets;
