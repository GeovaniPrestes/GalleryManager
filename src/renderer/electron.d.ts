interface ModelRecord {
    id: number;
    name: string;
    description: string | null;
    thumbnailPath: string | null;
    createdAt: Date;
    updatedAt: Date;
    folderPath: string | null;
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

interface MinisetRecord {
    id: number;
    name: string;
    folderPath: string;
    parentId: number | null;
    setId: number;
    thumbnailPath: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface ElectronAPI {
    createModel(data: {
        name: string;
        description: string;
        folderPath: string;
        selectedThumbnail: string | null;
    }): Promise<ModelRecord>;

    listModels(): Promise<ModelRecord[]>;

    updateModel(data: {
        id: number;
        name: string;
        description: string;
        folderPath: string;
        selectedThumbnail: string | null;
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

    deleteSet(id: number): Promise<{ success: boolean }>;

    listSets(): Promise<SetRecord[]>;

    selectSetFolder(): Promise<string | null>;

    scanMinisets(setId: number): Promise<{
        success: boolean;
        total: number;
    }>;

    listMinisets(data: {
        setId: number;
        parentId: number | null;
    }): Promise<MinisetRecord[]>;

    generateSetThumbnail(id: number): Promise<{
        success: boolean;
        thumbnailPath: string | null;
    }>;

    generateMissingSetThumbnails(): Promise<{
        success: boolean;
        total: number;
        generated: number;
    }>;

    selectModelFolder(): Promise<string | null>;

    selectModelThumbnail(): Promise<string | null>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { type SetRecord, type ModelRecord };
