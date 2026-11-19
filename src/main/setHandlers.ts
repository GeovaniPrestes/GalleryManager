import { dialog, ipcMain } from "electron";
import GallerySet from "../database/models/GallerySet";
import Model from "../database/models/Model";
import SetModel from "../database/models/SetModel";
import Miniset from "../database/models/Miniset";
import { scanMinisetFolders } from "./services/minisetScanner";
import { generateThumbnailFromFolder } from "./services/thumbnailGenerator";

export function registerSetHandlers(): void {

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

    ipcMain.handle("sets:create", async (_event, data) => {
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();
        const folderPath = String(data?.folderPath ?? "").trim();
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

        const gallerySet = await GallerySet.create({
            name,
            description: description || null,
            folderPath,
            thumbnailPath: null
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

        console.log("Modelos associados ao Set:", savedRelations.map(
            (relation) => relation.toJSON()
        ));

        return gallerySet.toJSON();
    });

    ipcMain.handle("sets:update", async (_event, data) => {
        const id = Number(data?.id);
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();
        const folderPath = String(data?.folderPath ?? "").trim();

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
                    folderPath
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

        const transaction = await GallerySet.sequelize!.transaction();

        try {
            await SetModel.destroy({
                where: { setId },
                transaction
            });

            await gallerySet.destroy({ transaction });

            await transaction.commit();

            return { success: true };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
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

        const transaction = await Miniset.sequelize!.transaction();

        try {
            const minisetIds = new Map<string, number>();

            for (const folder of scannedFolders) {
                const parentId = folder.parentPath
                    ? minisetIds.get(folder.parentPath) ?? null
                    : null;

                const [miniset] = await Miniset.findOrCreate({
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

                const thumbnailPath = miniset.thumbnailPath
                    ?? await generateThumbnailFromFolder(folder.folderPath);

                console.log("Miniset:", folder.name);
                console.log("Thumbnail:", thumbnailPath);

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

            await transaction.commit();

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
