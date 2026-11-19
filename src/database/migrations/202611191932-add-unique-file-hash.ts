import type { QueryInterface } from "sequelize";

interface MigrationContext {
    context: QueryInterface;
}

const INDEX_NAME = "media_file_hash_unique";

interface IndexDescription {
    name?: string;
    unique?: boolean;
    fields: Array<{ attribute?: string; name?: string }>;
}

export async function up({ context }: MigrationContext): Promise<void> {
    const indexes = await context.showIndex("media") as unknown as IndexDescription[];

    const hasUniqueHashIndex = indexes.some(index =>
        index.unique &&
        index.fields.length === 1 &&
        (
            index.fields[0].attribute === "fileHash" ||
            index.fields[0].name === "fileHash"
        )
    );

    if (!hasUniqueHashIndex) {
        await context.addIndex("media", ["fileHash"], {
            unique: true,
            name: INDEX_NAME
        });
    }
}

export async function down({ context }: MigrationContext): Promise<void> {
    const indexes = await context.showIndex("media") as unknown as IndexDescription[];

    const indexExists = indexes.some(index =>
        index.name === INDEX_NAME
    );

    if (indexExists) {
        await context.removeIndex("media", INDEX_NAME);
    }
}