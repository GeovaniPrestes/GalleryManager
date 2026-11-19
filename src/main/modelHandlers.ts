import { ipcMain } from "electron";
import Model from "../database/models/Model";

export function registerModelHandlers(): void {

    ipcMain.handle("models:create", async (_event, data) => {
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();

        if (!name) {
            throw new Error("O nome do modelo é obrigatório.");
        }

        const model = await Model.create({
            name,
            description: description || null,
            thumbnailPath: null
        });

        return model.toJSON();
    });


    ipcMain.handle("models:update", async (_event, data) => {
        const id = Number(data?.id);
        const name = String(data?.name ?? "").trim();
        const description = String(data?.description ?? "").trim();

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

        await model.update({
            name,
            description: description || null
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
