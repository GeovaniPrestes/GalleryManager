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

        return gallerySet.toJSON();
    });

    ipcMain.handle("sets:list", async () => {
        const sets = await GallerySet.findAll({
            order: [["name", "ASC"]]
        });

        return sets.map((gallerySet) => gallerySet.toJSON());
    });
}
