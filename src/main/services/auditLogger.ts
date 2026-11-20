import AuditLog from "../../database/models/AuditLog";

type AuditAction = "create" | "update" | "delete";

interface AuditLogData {
    entity: string;
    entityId?: number | null;
    action: AuditAction;
    description: string;
    changes?: Record<string, any> | null;
}

export async function registerAuditLog(
    data: AuditLogData
): Promise<void> {
    await AuditLog.create({
        entity: data.entity,
        entityId: data.entityId ?? null,
        action: data.action,
        description: data.description,
        changes: data.changes
            ? JSON.stringify(data.changes)
            : null
    });
}
