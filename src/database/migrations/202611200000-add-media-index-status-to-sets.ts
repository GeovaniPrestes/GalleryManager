
import type { QueryInterface } from "sequelize";
import { DataTypes } from "sequelize";

interface MigrationContext {
    context: QueryInterface;
}

export async function up({ context }: MigrationContext): Promise<void> {
    const columns = await context.describeTable("sets");

    if (!columns.mediaIndexStatus) {
        await context.addColumn("sets", "mediaIndexStatus", {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "pending"
        });
    }

    if (!columns.mediaIndexedAt) {
        await context.addColumn("sets", "mediaIndexedAt", {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        });
    }
}

export async function down({ context }: MigrationContext): Promise<void> {
    const columns = await context.describeTable("sets");

    if (columns.mediaIndexedAt) {
        await context.removeColumn("sets", "mediaIndexedAt");
    }

    if (columns.mediaIndexStatus) {
        await context.removeColumn("sets", "mediaIndexStatus");
    }
}
