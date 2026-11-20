
import { ipcMain } from "electron";
import { QueryTypes } from "sequelize";

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

        const rankings = await Model.sequelize!.query(
            `
    SELECT
        m.id AS modelId,
        m.name AS modelName,

        (
            SELECT COUNT(DISTINCT sm.setId)
            FROM set_models sm
            WHERE sm.modelId = m.id
        ) AS totalSets,

        (
            SELECT COUNT(DISTINCT ml.mediaId)
            FROM set_models sm
            INNER JOIN media_locations ml
                ON ml.setId = sm.setId
            WHERE sm.modelId = m.id
        ) AS totalMedia,

        (
            SELECT COALESCE(SUM(media_sizes.fileSize), 0)
            FROM (
                SELECT
                    ml.mediaId,
                    MAX(ml.fileSize) AS fileSize
                FROM set_models sm
                INNER JOIN media_locations ml
                    ON ml.setId = sm.setId
                WHERE sm.modelId = m.id
                GROUP BY ml.mediaId
            ) media_sizes
        ) AS totalSize

    FROM models m
    `,
            {
                type: QueryTypes.SELECT
            }
        ) as Array<{
            modelId: number;
            modelName: string;
            totalSets: number;
            totalMedia: number;
            totalSize: number;
        }>;

        const topModelsBySets = [...rankings]
            .sort((a, b) => Number(b.totalSets) - Number(a.totalSets))
            .slice(0, 5);

        const topModelsBySize = [...rankings]
            .sort((a, b) => Number(b.totalSize) - Number(a.totalSize))
            .slice(0, 5);

        const topModelsByMedia = [...rankings]
            .sort((a, b) => Number(b.totalMedia) - Number(a.totalMedia))
            .slice(0, 5);

        return {
            statistics: {
                models,
                sets,
                minisets,
                media
            },
            recentActivity: recentActivity.map(log => log.toJSON()),
            rankings: {
                topModelsBySets,
                topModelsBySize,
                topModelsByMedia
            }
        };
    });
}
