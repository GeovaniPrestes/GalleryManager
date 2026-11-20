import { dialog, ipcMain } from "electron";
import { generateThumbnail, generateThumbnailFromFolder } from "./services/thumbnailGenerator";
import { allowPreviewPath } from "./services/previewAccess";
import { registerAuditLog } from "./services/auditLogger";
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

        const thumbnailPath = selectedThumbnail
            ? await generateThumbnail(selectedThumbnail)
            : folderPath
                ? await generateThumbnailFromFolder(folderPath)
                : null;

        if (!name) {
            throw new Error("O nome do modelo é obrigatório.");
        }

        const model = await Model.create({
            name,
            description: description || null,
            folderPath: folderPath || null,
            thumbnailPath: thumbnailPath || null,
        });

        await registerAuditLog({
            entity: "Model",
            entityId: model.id,
            action: "create",
            description: `Modelo "${model.name}" criado.`,
            changes: {
                name: model.name,
                description: model.description,
                folderPath: model.folderPath
            }
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

        const previousValues = {
            name: model.name,
            description: model.description,
            folderPath: model.folderPath
        };

        const newValues = {
            name,
            description: description || null,
            folderPath: folderPath || null
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

        await model.update({
            ...newValues,
            thumbnailPath
        });

        if (Object.keys(changes).length > 0) {
            await registerAuditLog({
                entity: "Model",
                entityId: model.id,
                action: "update",
                description: `Modelo "${model.name}" atualizado.`,
                changes
            });
        }

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

        await registerAuditLog({
            entity: "Model",
            entityId: model.id,
            action: "delete",
            description: `Modelo "${model.name}" excluído.`,
            changes: {
                name: model.name,
                description: model.description,
                folderPath: model.folderPath
            }
        });

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
