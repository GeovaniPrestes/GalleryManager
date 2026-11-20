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
    mediaIndexStatus: "pending" | "indexing" | "indexed" | "error";
    mediaIndexedAt: Date | null;
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

interface SetMediaRecord {
    id: number;
    fileHash: string | null;
    mediaType: "image" | "video";
    thumbnailPath: string | null;
    locations: {
        id: number;
        mediaId: number;
        filePath: string;
        fileName: string;
        extension: string;
        fileSize: number;
        setId: number | null;
        minisetId: number | null;
        miniset: {
            id: number;
            name: string;
            parentId: number | null;
            folderPath: string;
        } | null;
    }[];
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
        selectedThumbnail: string | null;
    }): Promise<SetRecord>;

    updateSet(data: {
        id: number;
        name: string;
        description: string;
        folderPath: string;
        modelIds: number[];
        selectedThumbnail: string | null;
    }): Promise<SetRecord>;

    deleteSet(id: number): Promise<{ success: boolean }>;

    listSets(): Promise<SetRecord[]>;

    listSetMedia(setId: number): Promise<SetMediaRecord[]>;

    selectSetFolder(initialPath?: string): Promise<string | null>;

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

    selectSetThumbnail(folderPath: string): Promise<string | null>;

    indexSetMedia(setId: number): Promise<{
        success: boolean;
        totalFiles: number;
        newMedia: number;
        newLocations: number;
        existingMedia: number;
        errors: number;
    }>;

    listMedia(data: {
        limit: number;
        offset: number;
    }): Promise<{
        total: number;
        media: {
            id: number;
            fileHash: string | null;
            mediaType: "image" | "video";
            thumbnailPath: string | null;
            locations: {
                id: number;
                mediaId: number;
                filePath: string;
                fileName: string;
                extension: string;
                fileSize: number;
                setId: number | null;
                minisetId: number | null;
                gallerySet: {
                    id: number;
                    name: string;
                } | null;
                miniset: {
                    id: number;
                    name: string;
                } | null;
            }[];
        }[];
    }>;

    listAuditLogs: (data: {
        limit: number;
        offset: number;
        action?: "create" | "update" | "delete";
        entity?: string;
    }) => Promise<{
        total: number;
        logs: Array<{
            id: number;
            entity: string;
            entityId: number | null;
            action: "create" | "update" | "delete";
            description: string;
            changes: string | null;
            createdAt: Date;
        }>;
    }>;

    getDashboardData: () => Promise<{
        statistics: {
            models: number;
            sets: number;
            minisets: number;
            media: number;
        };
        recentActivity: Array<{
            id: number;
            entity: string;
            entityId: number | null;
            action: "create" | "update" | "delete";
            description: string;
            changes: string | null;
            createdAt: Date;
        }>;
        rankings: {
            topModelsBySets: Array<{
                modelId: number;
                modelName: string;
                totalSets: number;
                totalMedia: number;
                totalSize: number;
            }>;
            topModelsBySize: Array<{
                modelId: number;
                modelName: string;
                totalSets: number;
                totalMedia: number;
                totalSize: number;
            }>;
            topModelsByMedia: Array<{
                modelId: number;
                modelName: string;
                totalSets: number;
                totalMedia: number;
                totalSize: number;
            }>;
        };
    }>;

    scanModelSetFolders: (modelId: number) => Promise<Array<{
        name: string;
        folderPath: string;
        alreadyRegistered: boolean;
    }>>;

    checkMediaIndex: (setIds: number[]) => Promise<Array<{
        setId: number;
        totalFiles: number;
        registeredFiles: number;
        newFiles: number;
        removedFiles: number;
        changedFiles: number;
        status: "pending" | "error" | "changed" | "indexed";
        needsIndexing: boolean;
    }>>;

    openErrorLogsFolder: () => Promise<boolean>;

    getUnavailableSetIds: () => Promise<number[]>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {
    type SetRecord,
    type ModelRecord,
    type MinisetRecord,
    type SetMediaRecord
};
