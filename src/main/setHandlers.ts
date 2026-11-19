import { dialog, ipcMain } from "electron";
import GallerySet from "../database/models/GallerySet";
import Model from "../database/models/Model";
import SetModel from "../database/models/SetModel";

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
