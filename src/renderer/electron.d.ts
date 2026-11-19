interface ModelRecord {
    id: number;
    name: string;
    description: string | null;
    thumbnailPath: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface SetRecord {
    id: number;
    name: string;
    description: string | null;
    folderPath: string;
    thumbnailPath: string | null;
    createdAt: Date;
    updatedAt: Date;
    models: {
        id: number;
        name: string;
    }[];
}

interface ElectronAPI {
    createModel(data: {
        name: string;
        description: string;
    }): Promise<ModelRecord>;

    listModels(): Promise<ModelRecord[]>;

    updateModel(data: {
        id: number;
        name: string;
        description: string;
    }): Promise<ModelRecord>;

    deleteModel(id: number): Promise<{ success: boolean }>;

    createSet(data: {
        name: string;
        description: string;
        folderPath: string;
        modelIds: number[];
    }): Promise<SetRecord>;

    updateSet(data: {
        id: number;
        name: string;
        description: string;
        folderPath: string;
        modelIds: number[];
    }): Promise<SetRecord>;

    listSets(): Promise<SetRecord[]>;

    selectSetFolder(): Promise<string | null>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { type SetRecord, type ModelRecord };
