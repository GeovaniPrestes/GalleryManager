import { dialog, ipcMain } from "electron";
import { generateThumbnail, generateThumbnailFromFolder } from "./services/thumbnailGenerator";
import { allowPreviewPath } from "./services/previewAccess";
import Model from "../database/models/Model";

export function registerModelHandlers(): void {

    ipcMain.handle("models:select-folder", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openDirectory"]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    });

    ipcMain.handle("models:select-thumbnail", async () => {
        const result = await dialog.showOpenDialog({
            title: "Selecionar thumbnail do modelo",
            properties: ["openFile"],
            filters: [
                {
                    name: "Imagens",
                    extensions: ["jpg", "jpeg", "png", "webp", "avif", "tiff", "gif"]
                }
            ]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const selectedPath = result.filePaths[0];

        allowPreviewPath(selectedPath);

        return selectedPath;
    });

    ipcMain.handle("models:create", async (_event, data) => {
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();
        const folderPath = String(data?.folderPath ?? "").trim();
        const selectedThumbnail = String(data?.selectedThumbnail ?? "").trim();
        console.log("Pasta recebida:", folderPath);

        const thumbnailPath = selectedThumbnail
            ? await generateThumbnail(selectedThumbnail)
            : folderPath
                ? await generateThumbnailFromFolder(folderPath)
                : null;

        console.log("Thumbnail gerada:", thumbnailPath);

        if (!name) {
            throw new Error("O nome do modelo é obrigatório.");
        }

        const model = await Model.create({
            name,
            description: description || null,
            folderPath: folderPath || null,
            thumbnailPath: thumbnailPath || null,
        });

        return model.toJSON();
    });


    ipcMain.handle("models:update", async (_event, data) => {
        const id = Number(data?.id);
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();
        const folderPath = String(data?.folderPath ?? "").trim();
        const selectedThumbnail = String(data?.selectedThumbnail ?? "").trim();

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error("ID do modelo inválido.");
        }

        if (!name) {
            throw new Error("O nome do modelo é obrigatório.");
        }

        const model = await Model.findByPk(id);

        if (!model) {
            throw new Error("Modelo não encontrado.");
        }

        const thumbnailPath = selectedThumbnail
            ? await generateThumbnail(selectedThumbnail)
            : folderPath !== (model.folderPath ?? "")
                ? await generateThumbnailFromFolder(folderPath)
                : model.thumbnailPath;

        await model.update({
            name,
            description: description || null,
            folderPath: folderPath || null,
            thumbnailPath
        });

        return model.toJSON();
    });

    ipcMain.handle("models:delete", async (_event, id) => {
        const modelId = Number(id);

        if (!Number.isInteger(modelId) || modelId <= 0) {
            throw new Error("ID do modelo inválido.");
        }

        const model = await Model.findByPk(modelId);

        if (!model) {
            throw new Error("Modelo não encontrado.");
        }

        await model.destroy();

        return { success: true };
    });

    ipcMain.handle("models:list", async () => {
        const models = await Model.findAll({
            order: [["name", "ASC"]]
        });

        return models.map((model) => model.toJSON());
    });
}
