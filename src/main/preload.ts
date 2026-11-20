import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    createModel: (data: {
        name: string;
        description: string;
    }) => ipcRenderer.invoke("models:create", data),

    listModels: () => ipcRenderer.invoke("models:list"),

    updateModel: (data: {
        id: number;
        name: string;
        description: string;
    }) => ipcRenderer.invoke("models:update", data),

    deleteModel: (id: number) =>
        ipcRenderer.invoke("models:delete", id),

    createSet: (data: {
        name: string;
        description: string;
        folderPath: string;
        modelIds: number[];
    }) => ipcRenderer.invoke("sets:create", data),

    updateSet: (data: {
        id: number;
        name: string;
        description: string;
        folderPath: string;
        modelIds: number[];
    }) => ipcRenderer.invoke("sets:update", data),

    deleteSet: (id: number) =>
        ipcRenderer.invoke("sets:delete", id),

    listSets: () => ipcRenderer.invoke("sets:list"),

    selectSetFolder: (initialPath?: string) =>
        ipcRenderer.invoke("sets:select-folder", initialPath),

    scanMinisets: (setId: number) =>
        ipcRenderer.invoke("sets:scan-minisets", setId),

    listMinisets: (data: {
        setId: number;
        parentId: number | null;
    }) => ipcRenderer.invoke("minisets:list", data),

    generateSetThumbnail: (id: number) =>
        ipcRenderer.invoke("sets:generate-thumbnail", id),

    generateMissingSetThumbnails: () =>
        ipcRenderer.invoke("sets:generate-missing-thumbnails"),

    selectModelFolder: () =>
        ipcRenderer.invoke("models:select-folder"),

    selectModelThumbnail: () =>
        ipcRenderer.invoke("models:select-thumbnail"),

    selectSetThumbnail: (folderPath: string) =>
        ipcRenderer.invoke("sets:select-thumbnail", folderPath),

    indexSetMedia: (setId: number) =>
        ipcRenderer.invoke("sets:index-media", setId),

    listMedia: (data: {
        limit: number;
        offset: number;
    }) => ipcRenderer.invoke("media:list", data),

    listAuditLogs: (data: {
        limit: number;
        offset: number;
        action?: "create" | "update" | "delete";
        entity?: string;
    }) => ipcRenderer.invoke("audit:list", data),

    getDashboardData: () => ipcRenderer.invoke("dashboard:get-data"),

    scanModelSetFolders: (modelId: number) =>
        ipcRenderer.invoke("sets:scan-model-folders", modelId),

    checkMediaIndex: (setIds: number[]) =>
        ipcRenderer.invoke("sets:check-media-index", setIds),
});
