import { ipcMain } from "electron";
import AuditLog from "../database/models/AuditLog";

export function registerAuditHandlers(): void {
    ipcMain.handle("audit:list", async (_event, data) => {
        const limit = Math.min(
            Math.max(Number(data?.limit) || 50, 1),
            500
        );

        const offset = Math.max(
            Number(data?.offset) || 0,
            0
        );

        const result = await AuditLog.findAndCountAll({
            limit,
            offset,
            order: [["createdAt", "DESC"]]
        });

        return {
            total: result.count,
            logs: result.rows.map(log => log.toJSON())
        };
    });
}