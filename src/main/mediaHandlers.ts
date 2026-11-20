import { ipcMain } from "electron";
import Media from "../database/models/Media";
import MediaLocation from "../database/models/MediaLocation";
import GallerySet from "../database/models/GallerySet";
import { allowPreviewPath } from "./services/previewAccess";
import Miniset from "../database/models/Miniset";
import Model from "../database/models/Model";

export function registerMediaHandlers(): void {
    ipcMain.handle("media:list", async (_event, data) => {
        const limit = Math.min(
            Math.max(Number(data?.limit) || 100, 1),
            500
        );

        const offset = Math.max(
            Number(data?.offset) || 0,
            0
        );

        const result = await Media.findAndCountAll({
            include: [
                {
                    model: MediaLocation,
                    as: "locations",
                    include: [
                        {
                            model: GallerySet,
                            as: "gallerySet",
                            attributes: ["id", "name"],
                            include: [
                                {
                                    model: Model,
                                    as: "models",
                                    attributes: ["id", "name"],
                                    through: {
                                        attributes: []
                                    }
                                }
                            ]
                        },
                        {
                            model: Miniset,
                            as: "miniset",
                            attributes: ["id", "name"]
                        }
                    ]
                }
            ],
            limit,
            offset,
            distinct: true,
            order: [["id", "DESC"]]
        });

        for (const media of result.rows) {
            for (const location of media.locations ?? []) {
                allowPreviewPath(location.filePath);
            }
        }

        return {
            total: result.count,
            media: result.rows.map(media => media.toJSON())
        };
    });
}