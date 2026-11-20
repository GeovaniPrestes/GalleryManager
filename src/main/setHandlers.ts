import { dialog, ipcMain } from "electron";
import { scanMinisetFolders } from "./services/minisetScanner";
import { generateThumbnail, generateThumbnailFromFolder } from "./services/thumbnailGenerator";
import { allowPreviewPath } from "./services/previewAccess";
import { indexSetMedia } from "./services/Media/mediaIndexer";
import { registerAuditLog } from "./services/auditLogger";
import { resolve } from "node:path";
import GallerySet from "../database/models/GallerySet";
import Model from "../database/models/Model";
import SetModel from "../database/models/SetModel";
import Miniset from "../database/models/Miniset";

export function registerSetHandlers(): void {

    ipcMain.handle("sets:index-media", async (_event, id) => {
        const setId = Number(id);

        if (!Number.isInteger(setId) || setId <= 0) {
            throw new Error("ID do Set inválido.");
        }

        const result = await indexSetMedia(setId);

        return {
            success: true,
            ...result
        };
    });

    ipcMain.handle("sets:select-folder", async () => {
        const result = await dialog.showOpenDialog({
            title: "Selecionar pasta do Set",
            properties: ["openDirectory"]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    });

    ipcMain.handle("sets:select-thumbnail", async (_event, folderPath) => {
        const initialPath = String(folderPath ?? "").trim();

        const result = await dialog.showOpenDialog({
            title: "Selecionar thumbnail do set",
            defaultPath: initialPath || undefined,
            properties: ["openFile"],
            filters: [{
                name: "Imagens",
                extensions: ["jpg", "jpeg", "png", "webp", "avif", "tiff", "gif"]
            }]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const selectedPath = result.filePaths[0];

        allowPreviewPath(selectedPath);

        return selectedPath;
    });

    ipcMain.handle("sets:create", async (_event, data) => {
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();
        const folderPath = String(data?.folderPath ?? "").trim();
        const selectedThumbnail = String(data?.selectedThumbnail ?? "").trim();
        const modelIds: number[] = Array.isArray(data?.modelIds)
            ? data.modelIds.map((id: unknown) => Number(id))
            : [];

        if (!name) {
            throw new Error("O nome do set é obrigatório.");
        }

        if (!folderPath) {
            throw new Error("A pasta do set é obrigatória.");
        }

        const existingSet = await GallerySet.findOne({
            where: { folderPath }
        });

        if (existingSet) {
            throw new Error("Essa pasta já está cadastrada em outro set.");
        }


        const uniqueModelIds = [...new Set(modelIds)];

        if (uniqueModelIds.some(
            (id) => !Number.isInteger(id) || id <= 0
        )) {
            throw new Error("Um ou mais modelos selecionados são inválidos.");
        }

        if (uniqueModelIds.length > 0) {
            const existingModels = await Model.findAll({
                where: {
                    id: uniqueModelIds
                }
            });

            if (existingModels.length !== uniqueModelIds.length) {
                throw new Error("Um ou mais modelos não foram encontrados.");
            }
        }

        const thumbnailPath = selectedThumbnail
            ? await generateThumbnail(selectedThumbnail)
            : await generateThumbnailFromFolder(folderPath);

        const gallerySet = await GallerySet.create({
            name,
            description: description || null,
            folderPath,
            thumbnailPath: thumbnailPath || null
        });

        if (uniqueModelIds.length > 0) {
            await SetModel.bulkCreate(
                uniqueModelIds.map((modelId) => ({
                    setId: gallerySet.id,
                    modelId
                }))
            );
        }

        const savedRelations = await SetModel.findAll({
            where: {
                setId: gallerySet.id
            }
        });

        await registerAuditLog({
            entity: "GallerySet",
            entityId: gallerySet.id,
            action: "create",
            description: `Set "${gallerySet.name}" criado.`,
            changes: {
                name: gallerySet.name,
                description: gallerySet.description,
                folderPath: gallerySet.folderPath,
                modelIds: uniqueModelIds
            }
        });

        return gallerySet.toJSON();
    });

    ipcMain.handle("sets:update", async (_event, data) => {
        const id = Number(data?.id);
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();
        const folderPath = String(data?.folderPath ?? "").trim();
        const selectedThumbnail = String(data?.selectedThumbnail ?? "").trim();

        const modelIds: number[] = Array.isArray(data?.modelIds)
            ? data.modelIds.map((id: unknown) => Number(id))
            : [];

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error("ID do Set inválido.");
        }

        if (!name) {
            throw new Error("O nome do Set é obrigatório.");
        }

        if (!folderPath) {
            throw new Error("A pasta do Set é obrigatória.");
        }

        const gallerySet = await GallerySet.findByPk(id);

        if (!gallerySet) {
            throw new Error("Set não encontrado.");
        }

        const existingSet = await GallerySet.findOne({
            where: { folderPath }
        });

        if (existingSet && existingSet.id !== id) {
            throw new Error("Essa pasta já está cadastrada em outro Set.");
        }

        const uniqueModelIds = [...new Set(modelIds)];

        if (uniqueModelIds.some(
            (modelId) => !Number.isInteger(modelId) || modelId <= 0
        )) {
            throw new Error("Um ou mais modelos selecionados são inválidos.");
        }

        const thumbnailPath = selectedThumbnail
            ? await generateThumbnail(selectedThumbnail)
            : folderPath !== gallerySet.folderPath
                ? await generateThumbnailFromFolder(folderPath)
                : gallerySet.thumbnailPath;

        const previousValues = {
            name: gallerySet.name,
            description: gallerySet.description,
            folderPath: gallerySet.folderPath
        };

        const previousRelations = await SetModel.findAll({
            where: { setId: id }
        });

        const previousModelIds = previousRelations
            .map(relation => relation.modelId)
            .sort((a, b) => a - b);

        const newModelIds = [...uniqueModelIds].sort((a, b) => a - b);

        const newValues = {
            name,
            description: description || null,
            folderPath
        };

        const changes: Record<string, { old: any; new: any }> = {};

        for (const key of Object.keys(newValues) as Array<keyof typeof newValues>) {
            if (previousValues[key] !== newValues[key]) {
                changes[key] = {
                    old: previousValues[key],
                    new: newValues[key]
                };
            }
        }

        if (JSON.stringify(previousModelIds) !== JSON.stringify(newModelIds)) {
            changes.modelIds = {
                old: previousModelIds,
                new: newModelIds
            };
        }

        const transaction = await GallerySet.sequelize!.transaction();

        try {
            if (uniqueModelIds.length > 0) {
                const existingModels = await Model.findAll({
                    where: { id: uniqueModelIds },
                    transaction
                });

                if (existingModels.length !== uniqueModelIds.length) {
                    throw new Error("Um ou mais modelos não foram encontrados.");
                }
            }

            await gallerySet.update(
                {
                    name,
                    description: description || null,
                    folderPath,
                    thumbnailPath: thumbnailPath || null
                },
                { transaction }
            );

            await SetModel.destroy({
                where: { setId: id },
                transaction
            });

            if (uniqueModelIds.length > 0) {
                await SetModel.bulkCreate(
                    uniqueModelIds.map((modelId) => ({
                        setId: id,
                        modelId
                    })),
                    { transaction }
                );
            }

            await transaction.commit();

            if (Object.keys(changes).length > 0) {
                await registerAuditLog({
                    entity: "GallerySet",
                    entityId: gallerySet.id,
                    action: "update",
                    description: `Set "${gallerySet.name}" atualizado.`,
                    changes
                });
            }

            return gallerySet.toJSON();

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });

    ipcMain.handle("sets:delete", async (_event, id) => {
        const setId = Number(id);

        if (!Number.isInteger(setId) || setId <= 0) {
            throw new Error("ID do Set inválido.");
        }

        const gallerySet = await GallerySet.findByPk(setId);

        if (!gallerySet) {
            throw new Error("Set não encontrado.");
        }

        const setData = {
            name: gallerySet.name,
            description: gallerySet.description,
            folderPath: gallerySet.folderPath
        };

        const relations = await SetModel.findAll({
            where: { setId }
        });

        const modelIds = relations.map(relation => relation.modelId);

        const transaction = await GallerySet.sequelize!.transaction();

        try {
            await SetModel.destroy({
                where: { setId },
                transaction
            });

            await gallerySet.destroy({ transaction });

            await transaction.commit();

            await registerAuditLog({
                entity: "GallerySet",
                entityId: setId,
                action: "delete",
                description: `Set "${setData.name}" excluído.`,
                changes: {
                    ...setData,
                    modelIds
                }
            });

            return { success: true };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });

    ipcMain.handle("sets:generate-thumbnail", async (_event, id) => {
        const setId = Number(id);

        if (!Number.isInteger(setId) || setId <= 0) {
            throw new Error("ID do Set inválido.");
        }

        const gallerySet = await GallerySet.findByPk(setId);

        if (!gallerySet) {
            throw new Error("Set não encontrado.");
        }

        const thumbnailPath = await generateThumbnailFromFolder(
            gallerySet.folderPath
        );

        await gallerySet.update({
            thumbnailPath
        });

        return {
            success: true,
            thumbnailPath
        };
    });

    ipcMain.handle("sets:generate-missing-thumbnails", async () => {
        const sets = await GallerySet.findAll({
            where: {
                thumbnailPath: null
            }
        });

        let generated = 0;

        for (const gallerySet of sets) {
            const thumbnailPath = await generateThumbnailFromFolder(
                gallerySet.folderPath
            );

            if (thumbnailPath) {
                await gallerySet.update({ thumbnailPath });
                generated++;
            }
        }

        return {
            success: true,
            total: sets.length,
            generated
        };
    });

    ipcMain.handle("sets:scan-minisets", async (_event, id) => {
        const setId = Number(id);

        if (!Number.isInteger(setId) || setId <= 0) {
            throw new Error("ID do Set inválido.");
        }

        const gallerySet = await GallerySet.findByPk(setId);

        if (!gallerySet) {
            throw new Error("Set não encontrado.");
        }

        const scannedFolders = await scanMinisetFolders(
            gallerySet.folderPath
        );

        const existingMinisets = await Miniset.findAll({
            where: { setId }
        });

        const scannedPaths = new Set(
            scannedFolders.map(folder =>
                resolve(folder.folderPath).toLowerCase()
            )
        );

        const removedMinisets = existingMinisets
            .filter(miniset =>
                !scannedPaths.has(resolve(miniset.folderPath).toLowerCase())
            )
            .sort((a, b) =>
                b.folderPath.length - a.folderPath.length
            );

        const transaction = await Miniset.sequelize!.transaction();

        try {
            const minisetIds = new Map<string, number>();

            const createdMinisets: Miniset[] = [];

            const updatedMinisets: {
                miniset: Miniset;
                changes: Record<string, { old: any; new: any }>;
            }[] = [];

            for (const folder of scannedFolders) {
                const parentId = folder.parentPath
                    ? minisetIds.get(folder.parentPath) ?? null
                    : null;

                const [miniset, created] = await Miniset.findOrCreate({
                    where: {
                        folderPath: folder.folderPath
                    },
                    defaults: {
                        name: folder.name,
                        folderPath: folder.folderPath,
                        parentId,
                        setId,
                        thumbnailPath: null
                    },
                    transaction
                });

                if (created) {
                    createdMinisets.push(miniset);
                }

                const thumbnailPath = miniset.thumbnailPath
                    ?? await generateThumbnailFromFolder(folder.folderPath);

                if (!created) {
                    const changes: Record<string, { old: any; new: any }> = {};

                    const previousValues = {
                        name: miniset.name,
                        parentId: miniset.parentId,
                        setId: miniset.setId,
                        thumbnailPath: miniset.thumbnailPath
                    };

                    const newValues = {
                        name: folder.name,
                        parentId,
                        setId,
                        thumbnailPath
                    };

                    for (const key of Object.keys(newValues) as Array<keyof typeof newValues>) {
                        if (previousValues[key] !== newValues[key]) {
                            changes[key] = {
                                old: previousValues[key],
                                new: newValues[key]
                            };
                        }
                    }

                    if (Object.keys(changes).length > 0) {
                        updatedMinisets.push({ miniset, changes });
                    }
                }

                await miniset.update(
                    {
                        name: folder.name,
                        parentId,
                        setId,
                        thumbnailPath
                    },
                    { transaction }
                );

                minisetIds.set(folder.folderPath, miniset.id);
            }

            for (const miniset of removedMinisets) {
                await miniset.destroy({ transaction });

                console.log(
                    "Miniset removido:",
                    miniset.name,
                    miniset.folderPath
                );
            }

            await transaction.commit();

            for (const miniset of createdMinisets) {
                await registerAuditLog({
                    entity: "Miniset",
                    entityId: miniset.id,
                    action: "create",
                    description: `Miniset "${miniset.name}" criado no Set "${gallerySet.name}".`,
                    changes: {
                        name: miniset.name,
                        folderPath: miniset.folderPath,
                        parentId: miniset.parentId,
                        setId: miniset.setId
                    }
                });
            }

            for (const item of updatedMinisets) {
                await registerAuditLog({
                    entity: "Miniset",
                    entityId: item.miniset.id,
                    action: "update",
                    description: `Miniset "${item.miniset.name}" atualizado no Set "${gallerySet.name}".`,
                    changes: item.changes
                });
            }

            for (const miniset of removedMinisets) {
                await registerAuditLog({
                    entity: "Miniset",
                    entityId: miniset.id,
                    action: "delete",
                    description: `Miniset "${miniset.name}" removido do Set "${gallerySet.name}" durante a sincronização.`,
                    changes: {
                        name: miniset.name,
                        folderPath: miniset.folderPath,
                        parentId: miniset.parentId,
                        setId: miniset.setId
                    }
                });
            }

            return {
                success: true,
                total: scannedFolders.length
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    });

    ipcMain.handle(
        "minisets:list",
        async (_event, data) => {
            const setId = Number(data?.setId);

            const parentId = data?.parentId === null
                ? null
                : Number(data?.parentId);

            if (!Number.isInteger(setId) || setId <= 0) {
                throw new Error("ID do Set inválido.");
            }

            if (
                parentId !== null &&
                (!Number.isInteger(parentId) || parentId <= 0)
            ) {
                throw new Error("ID do Miniset pai inválido.");
            }

            const gallerySet = await GallerySet.findByPk(setId);

            if (!gallerySet) {
                throw new Error("Set não encontrado.");
            }

            if (parentId !== null) {
                const parent = await Miniset.findOne({
                    where: {
                        id: parentId,
                        setId
                    }
                });

                if (!parent) {
                    throw new Error("Miniset pai não encontrado.");
                }
            }

            const minisets = await Miniset.findAll({
                where: {
                    setId,
                    parentId
                },
                order: [["name", "ASC"]]
            });

            return minisets.map((miniset) => miniset.toJSON());
        }
    );

    ipcMain.handle("sets:list", async () => {
        const sets = await GallerySet.findAll({
            include: [
                {
                    model: Model,
                    as: "models",
                    attributes: ["id", "name"],
                    through: {
                        attributes: []
                    }
                }
            ],
            order: [["name", "ASC"]]
        });

        return sets.map((gallerySet) => gallerySet.toJSON());
    });
}
