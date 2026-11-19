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
        ipcRenderer.invoke("models:delete", id)
});
