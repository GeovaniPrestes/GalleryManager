import { DataTypes, type QueryInterface } from "sequelize";

interface MigrationContext {
    context: QueryInterface;
}

export async function up({ context }: MigrationContext): Promise<void> {
    const columns = await context.describeTable("models");

    if (!columns.folderPath) {
        await context.addColumn("models", "folderPath", {
            type: DataTypes.STRING,
            allowNull: true
        });
    }
}

export async function down({ context }: MigrationContext): Promise<void> {
    const columns = await context.describeTable("models");

    if (columns.folderPath) {
        await context.removeColumn("models", "folderPath");
    }
}
