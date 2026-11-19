
import {
    DataTypes,
    QueryTypes,
    type QueryInterface
} from "sequelize";

interface MigrationContext {
    context: QueryInterface;
}

interface ExistingMedia {
    id: number;
    filePath: string;
    fileName: string;
    extension: string;
    fileSize: number;
}

export async function up({ context }: MigrationContext): Promise<void> {
    const mediaColumns = await context.describeTable("media");

    const requiredColumns = [
        "filePath",
        "fileName",
        "extension",
        "fileSize"
    ];

    if (!requiredColumns.every(column => mediaColumns[column])) {
        return;
    }

    const transaction = await context.sequelize.transaction();

    try {
        const existingMedia = await context.sequelize.query<ExistingMedia>(
            `SELECT id, filePath, fileName, extension, fileSize
             FROM media`,
            {
                type: QueryTypes.SELECT,
                transaction
            }
        );

        const existingLocations = await context.sequelize.query<{ mediaId: number }>(
            "SELECT mediaId FROM media_locations",
            {
                type: QueryTypes.SELECT,
                transaction
            }
        );

        const registeredMediaIds = new Set(
            existingLocations.map(location => location.mediaId)
        );

        const locationsToInsert = existingMedia
            .filter(media => !registeredMediaIds.has(media.id))
            .map(media => ({
                mediaId: media.id,
                filePath: media.filePath,
                fileName: media.fileName,
                extension: media.extension,
                fileSize: media.fileSize
            }));

        if (locationsToInsert.length > 0) {
            await context.bulkInsert(
                "media_locations",
                locationsToInsert,
                { transaction }
            );
        }

        for (const column of requiredColumns) {
            if (mediaColumns[column]) {
                await context.removeColumn("media", column, {
                    transaction
                });
            }
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

export async function down({ context }: MigrationContext): Promise<void> {
    const mediaColumns = await context.describeTable("media");

    const requiredColumns = [
        "filePath",
        "fileName",
        "extension",
        "fileSize"
    ];

    if (requiredColumns.every(column => mediaColumns[column])) {
        return;
    }

    const transaction = await context.sequelize.transaction();

    try {
        for (const column of requiredColumns) {
            if (!mediaColumns[column]) {
                await context.addColumn("media", column, {
                    type: column === "fileSize"
                        ? DataTypes.BIGINT
                        : DataTypes.STRING,
                    allowNull: true
                }, { transaction });
            }
        }

        const locations = await context.sequelize.query<{
            mediaId: number;
            filePath: string;
            fileName: string;
            extension: string;
            fileSize: number;
        }>(
            `SELECT mediaId, filePath, fileName, extension, fileSize
             FROM media_locations
             ORDER BY id ASC`,
            {
                type: QueryTypes.SELECT,
                transaction
            }
        );

        const locationsByMedia = new Map<number, typeof locations[number]>();

        for (const location of locations) {
            if (locationsByMedia.has(location.mediaId)) {
                throw new Error(
                    "Não é possível reverter: existem mídias com múltiplas localizações."
                );
            }

            locationsByMedia.set(location.mediaId, location);
        }

        for (const [mediaId, location] of locationsByMedia) {
            await context.bulkUpdate(
                "media",
                {
                    filePath: location.filePath,
                    fileName: location.fileName,
                    extension: location.extension,
                    fileSize: location.fileSize
                },
                { id: mediaId },
                { transaction }
            );
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
