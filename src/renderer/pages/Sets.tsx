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
    const [unavailableSetIds, setUnavailableSetIds] = useState<number[]>([]);

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

    const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);

    const filteredSets = showUnavailableOnly
        ? sets.filter((gallerySet) =>
            unavailableSetIds.includes(gallerySet.id)
        )
        : sets;

    const [selectedAutoFolders, setSelectedAutoFolders] = useState<string[]>([]);

    const [scanning, setScanning] = useState(false);

    const [showAutoIndexForm, setShowAutoIndexForm] = useState(false);
    const [autoIndexModelId, setAutoIndexModelId] = useState<number | "">("");
    const [scannedIndexSets, setScannedIndexSets] = useState<Array<
        SetRecord & {
            totalFiles: number;
            registeredFiles: number;
            newFiles: number;
            removedFiles: number;
            changedFiles: number;
            status: "pending" | "error" | "changed" | "indexed";
            needsIndexing: boolean;
        }
    >>([]);
    const [selectedIndexSets, setSelectedIndexSets] = useState<number[]>([]);
    const [indexingAll, setIndexingAll] = useState(false);

    const [indexingProgress, setIndexingProgress] = useState({
        current: 0,
        total: 0,
        currentSetName: ""
    });

    const [autoIndexResults, setAutoIndexResults] = useState<Array<{
        setId: number;
        setName: string;
        success: boolean;
        error?: string;
    }>>([]);

    async function handleCheckMediaIndex() {
        if (autoIndexModelId === "") {
            alert("Selecione um Modelo.");
            return;
        }

        const associatedSets = sets.filter((gallerySet) =>
            gallerySet.models.some(
                (model) => model.id === autoIndexModelId
            )
        );

        if (associatedSets.length === 0) {
            alert("Este Modelo não possui Sets cadastrados.");
            return;
        }

        setScanning(true);

        try {
            const results = await window.electronAPI.checkMediaIndex(
                associatedSets.map((gallerySet) => gallerySet.id)
            );

            const setsWithResults = associatedSets.flatMap((gallerySet) => {
                const result = results.find(
                    (item) => item.setId === gallerySet.id
                );

                if (!result) return [];

                return [{
                    ...gallerySet,
                    ...result
                }];
            });

            setScannedIndexSets(setsWithResults);

            setSelectedIndexSets(
                results
                    .filter((result) => result.needsIndexing)
                    .map((result) => result.setId)
            );

        } catch (error) {
            console.error("Erro ao verificar indexação:", error);
            alert("Não foi possível verificar os Sets.");
        } finally {
            setScanning(false);
        }
    }

    async function handleIndexSelectedSets() {
        if (selectedIndexSets.length === 0) {
            alert("Selecione pelo menos um Set para indexar.");
            return;
        }

        setIndexingAll(true);
        setAutoIndexResults([]);

        setIndexingProgress({
            current: 0,
            total: selectedIndexSets.length,
            currentSetName: ""
        });

        const results: typeof autoIndexResults = [];

        for (let i = 0; i < selectedIndexSets.length; i++) {
            const setId = selectedIndexSets[i];

            const gallerySet = scannedIndexSets.find(
                (item) => item.id === setId
            );

            if (!gallerySet) continue;

            setIndexingProgress({
                current: i + 1,
                total: selectedIndexSets.length,
                currentSetName: gallerySet.name
            });

            try {
                await window.electronAPI.indexSetMedia(setId);

                results.push({
                    setId,
                    setName: gallerySet.name,
                    success: true
                });

            } catch (error) {
                console.error(`Erro ao indexar ${gallerySet.name}:`, error);

                results.push({
                    setId,
                    setName: gallerySet.name,
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : "Erro desconhecido."
                });
            }

            setAutoIndexResults([...results]);
        }

        await loadSets();

        setIndexingAll(false);
        setIndexingProgress({
            current: 0,
            total: 0,
            currentSetName: ""
        });
    }

    async function loadSets() {
        try {
            const [setsResult, modelsResult, unavailableResult] = await Promise.all([
                window.electronAPI.listSets(),
                window.electronAPI.listModels(),
                window.electronAPI.getUnavailableSetIds()
            ]);

            setSets(setsResult);
            setModels(modelsResult);
            setUnavailableSetIds(unavailableResult);
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
            await loadSets();
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
                        onClick={async () => {
                            try {
                                await window.electronAPI.openErrorLogsFolder();
                            } catch (error) {
                                console.error("Erro ao abrir logs:", error);
                                alert("Não foi possível abrir a pasta de logs.");
                            }
                        }}
                    >
                        <span>📁</span> Abrir logs de erros
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            setShowAutoIndexForm(true);
                            setAutoIndexModelId("");
                            setScannedIndexSets([]);
                            setSelectedIndexSets([]);
                            setAutoIndexResults([]);
                        }}
                    >
                        Indexar mídias automaticamente
                    </button>
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
                    {filteredSets.length} {showUnavailableOnly
                        ? "Sets indisponíveis"
                        : "Sets cadastrados"}
                </span>

                <button
                    className={showUnavailableOnly ? "primary-button" : "secondary-button"}
                    onClick={() => setShowUnavailableOnly(!showUnavailableOnly)}
                >
                    {showUnavailableOnly
                        ? "Mostrar todos"
                        : "Somente indisponíveis"}
                </button>
            </div>

            {loading ? (
                <p>Carregando sets...</p>
            ) : filteredSets.length === 0 ? (
                <div className="empty-state">
                    <h3>Nenhum set cadastrado</h3>
                    <p>Adicione seu primeiro set à biblioteca.</p>
                </div>
            ) : (
                <div className="sets-grid">
                    {filteredSets.map((gallerySet) => (
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

                                {unavailableSetIds.includes(gallerySet.id) && (
                                    <span className="set-folder-unavailable">
                                        Pasta indisponível
                                    </span>
                                )}

                                <p>
                                    {gallerySet.description || "Sem descrição"}
                                </p>
                                <div className="set-index-info">
                                    <span className={`set-index-status status-${gallerySet.mediaIndexStatus}`}>
                                        {gallerySet.mediaIndexStatus === "pending" && "Não indexado"}
                                        {gallerySet.mediaIndexStatus === "indexing" && "Indexando..."}
                                        {gallerySet.mediaIndexStatus === "indexed" && "Indexado"}
                                        {gallerySet.mediaIndexStatus === "error" && "Erro na indexação"}
                                    </span>

                                    {gallerySet.mediaIndexedAt && (
                                        <small>
                                            Última indexação:{" "}
                                            {new Date(gallerySet.mediaIndexedAt).toLocaleString("pt-BR")}
                                        </small>
                                    )}
                                </div>
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
                                    disabled={unavailableSetIds.includes(gallerySet.id)}
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
                                    disabled={unavailableSetIds.includes(gallerySet.id)}
                                >
                                    Indexar subpastas
                                </button>

                                <button
                                    className="primary-button"
                                    onClick={() => handleIndexMedia(gallerySet)}
                                    disabled={
                                        unavailableSetIds.includes(gallerySet.id) ||
                                        indexingSetId !== null
                                    }
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
                                onClick={() => setShowForm(false)}
                                disabled={saving}
                            >
                                Fechar
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
                                        : "Cadastrar Set"}
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
            {showAutoIndexForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Indexar mídias automaticamente</h2>
                        </div>

                        <div className="modal-body">
                            <label>Selecione o Modelo</label>

                            <select
                                value={autoIndexModelId}
                                onChange={(e) => {
                                    setAutoIndexModelId(
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value)
                                    );

                                    setScannedIndexSets([]);
                                    setSelectedIndexSets([]);
                                }}
                                disabled={indexingAll}
                            >
                                <option value="">Selecione...</option>

                                {models.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                className="btn-primary"
                                onClick={handleCheckMediaIndex}
                                disabled={scanning || indexingAll || autoIndexModelId === ""}
                            >
                                {scanning ? "Verificando..." : "Verificar Sets"}
                            </button>
                            {scannedIndexSets.length > 0 && (
                                <div className="auto-index-list">
                                    <h3>Sets encontrados ({scannedIndexSets.length})</h3>

                                    {scannedIndexSets.map((gallerySet) => (
                                        <div className="auto-index-item" key={gallerySet.id}>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIndexSets.includes(gallerySet.id)}
                                                    onChange={(e) => {
                                                        setSelectedIndexSets((previous) =>
                                                            e.target.checked
                                                                ? [...previous, gallerySet.id]
                                                                : previous.filter(
                                                                    (id) => id !== gallerySet.id
                                                                )
                                                        );
                                                    }}
                                                    disabled={indexingAll}
                                                />

                                                <strong>{gallerySet.name}</strong>
                                            </label>

                                            <span>
                                                {gallerySet.status === "pending" && "Pendente"}
                                                {gallerySet.status === "error" && "Erro anterior"}
                                                {gallerySet.status === "changed" && "Alterações detectadas"}
                                                {gallerySet.status === "indexed" && "Atualizado"}
                                            </span>

                                            <div className="auto-index-details">
                                                <span>Arquivos: {gallerySet.totalFiles}</span>
                                                <span>Novos: {gallerySet.newFiles}</span>
                                                <span>Removidos: {gallerySet.removedFiles}</span>
                                                <span>Alterados: {gallerySet.changedFiles}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {indexingAll && (
                                <div className="auto-index-progress">
                                    <h3>Indexando mídias...</h3>

                                    <p>
                                        Set {indexingProgress.current} de {indexingProgress.total}
                                    </p>

                                    <strong>{indexingProgress.currentSetName}</strong>

                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${indexingProgress.total > 0
                                                    ? (indexingProgress.current / indexingProgress.total) * 100
                                                    : 0
                                                    }%`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            {autoIndexResults.length > 0 && (
                                <div className="auto-index-results">
                                    <h3>Resultados da indexação</h3>

                                    {autoIndexResults.map((result) => (
                                        <div
                                            className="auto-index-result-item"
                                            key={result.setId}
                                        >
                                            <strong>{result.setName}</strong>

                                            <span className={result.success ? "success" : "error"}>
                                                {result.success ? "Concluído" : "Falhou"}
                                            </span>

                                            {result.error && (
                                                <p>{result.error}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowAutoIndexForm(false)}
                                disabled={indexingAll}
                            >
                                Fechar
                            </button>

                            <button
                                className="btn-primary"
                                onClick={handleIndexSelectedSets}
                                disabled={
                                    indexingAll ||
                                    selectedIndexSets.length === 0 ||
                                    scannedIndexSets.length === 0
                                }
                            >
                                {indexingAll
                                    ? "Indexando..."
                                    : `Indexar selecionados (${selectedIndexSets.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}

export default Sets;
