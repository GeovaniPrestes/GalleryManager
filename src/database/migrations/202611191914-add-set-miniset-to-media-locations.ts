import {
    DataTypes,
    type QueryInterface
} from "sequelize";

interface MigrationContext {
    context: QueryInterface;
}

export async function up({ context }: MigrationContext): Promise<void> {
    const columns = await context.describeTable("media_locations");

    if (!columns.setId) {
        await context.addColumn("media_locations", "setId", {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "sets",
                key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
        });
    }

    if (!columns.minisetId) {
        await context.addColumn("media_locations", "minisetId", {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "minisets",
                key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
        });
    }
}

export async function down({ context }: MigrationContext): Promise<void> {
    const columns = await context.describeTable("media_locations");

    if (columns.minisetId) {
        await context.removeColumn("media_locations", "minisetId");
    }

    if (columns.setId) {
        await context.removeColumn("media_locations", "setId");
    }
}
