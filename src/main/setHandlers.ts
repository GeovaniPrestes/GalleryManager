import { dialog, ipcMain } from "electron";
import GallerySet from "../database/models/GallerySet";

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

        const gallerySet = await GallerySet.create({
            name,
            description: description || null,
            folderPath,
            thumbnailPath: null
        });

        return gallerySet.toJSON();
    });

    ipcMain.handle("sets:list", async () => {
        const sets = await GallerySet.findAll({
            order: [["name", "ASC"]]
        });

        return sets.map((gallerySet) => gallerySet.toJSON());
    });
}
