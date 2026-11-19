interface ModelRecord {
    id: number;
    name: string;
    description: string | null;
    thumbnailPath: string | null;
    createdAt: Date;
    updatedAt: Date;
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
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
