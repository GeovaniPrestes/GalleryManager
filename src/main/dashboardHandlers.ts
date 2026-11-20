
import { ipcMain } from "electron";

import Model from "../database/models/Model";
import GallerySet from "../database/models/GallerySet";
import Miniset from "../database/models/Miniset";
import Media from "../database/models/Media";
import AuditLog from "../database/models/AuditLog";

export function registerDashboardHandlers(): void {
    ipcMain.handle("dashboard:get-data", async () => {
        const [
            models,
            sets,
            minisets,
            media,
            recentActivity
        ] = await Promise.all([
            Model.count(),
            GallerySet.count(),
            Miniset.count(),
            Media.count(),
            AuditLog.findAll({
                order: [["createdAt", "DESC"]],
                limit: 8
            })
        ]);

        return {
            statistics: {
                models,
                sets,
                minisets,
                media
            },
            recentActivity: recentActivity.map(log => log.toJSON())
        };
    });
}
