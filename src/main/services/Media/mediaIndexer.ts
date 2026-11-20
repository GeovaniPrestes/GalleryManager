import Media from "../../../database/models/Media";
import MediaLocation from "../../../database/models/MediaLocation";
import GallerySet from "../../../database/models/GallerySet";
import Miniset from "../../../database/models/Miniset";
import { registerAuditLog } from "../auditLogger";
import { generateThumbnail, generateVideoThumbnail } from "../thumbnailGenerator";

import { scanMediaFolder } from "./mediaScanner";
import { calculateFileHash } from "./mediaHash";

export interface MediaIndexResult {
    totalFiles: number;
    newMedia: number;
    newLocations: number;
    existingMedia: number;
    errors: number;
}

function normalizePath(filePath: string): string {
    return filePath
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .toLowerCase();
}

export async function indexSetMedia(
    setId: number
): Promise<MediaIndexResult> {
    const result: MediaIndexResult = {
        totalFiles: 0,
        newMedia: 0,
        newLocations: 0,
        existingMedia: 0,
        errors: 0
    };

    const gallerySet = await GallerySet.findByPk(setId);

    if (!gallerySet) {
        throw new Error("Set não encontrado.");
    }

    const scannedFiles = await scanMediaFolder(
        gallerySet.folderPath
    );

    result.totalFiles = scannedFiles.length;

    const scannedPaths = new Set(
        scannedFiles.map(file => normalizePath(file.filePath))
    );

    const existingLocations = await MediaLocation.findAll({
        where: {
            setId
        }
    });

    const minisets = await Miniset.findAll({
        where: {
            setId
        }
    });

    const minisetPaths = new Map<string, number>();

    for (const miniset of minisets) {
        minisetPaths.set(
            miniset.folderPath.toLowerCase(),
            miniset.id
        );
    }

    function findMinisetId(filePath: string): number | null {
        const normalizedPath = normalizePath(filePath);

        let matchedId: number | null = null;
        let longestPathLength = 0;

        for (const [folderPath, minisetId] of minisetPaths) {
            const normalizedFolder = normalizePath(folderPath);

            if (
                normalizedPath.startsWith(normalizedFolder + "/") &&
                normalizedFolder.length > longestPathLength
            ) {
                matchedId = minisetId;
                longestPathLength = normalizedFolder.length;
            }
        }

        return matchedId;
    }

    const allLocations = await MediaLocation.findAll();

    const locationsByPath = new Map(
        allLocations.map(location => [
            normalizePath(location.filePath),
            location
        ])
    );

    for (const file of scannedFiles) {
        try {
            const fileHash = await calculateFileHash(file.filePath);

            let media = await Media.findOne({
                where: {
                    fileHash
                }
            });

            if (media) {
                result.existingMedia++;

                console.log(
                    "Mídia encontrada:",
                    media.id,
                    "Tipo:",
                    file.mediaType,
                    "Thumbnail:",
                    media.thumbnailPath
                );

                if (!media.thumbnailPath) {
                    console.log("Gerando thumbnail para:", file.filePath);

                    const thumbnailPath = file.mediaType === "image"
                        ? await generateThumbnail(file.filePath)
                        : await generateVideoThumbnail(file.filePath);

                    await media.update({
                        thumbnailPath
                    });

                    await registerAuditLog({
                        entity: "Media",
                        entityId: media.id,
                        action: "update",
                        description: "Thumbnail da mídia gerada durante a indexação.",
                        changes: {
                            thumbnailPath: {
                                old: null,
                                new: thumbnailPath
                            }
                        }
                    });
                }
            } else {
                const thumbnailPath = file.mediaType === "image"
                    ? await generateThumbnail(file.filePath)
                    : await generateVideoThumbnail(file.filePath);

                try {
                    media = await Media.create({
                        fileHash,
                        mediaType: file.mediaType,
                        thumbnailPath
                    });
                } catch (error: any) {
                    if (error.name !== "SequelizeUniqueConstraintError") {
                        throw error;
                    }

                    media = await Media.findOne({
                        where: {
                            fileHash
                        }
                    });

                    if (!media) {
                        throw error;
                    }

                    result.existingMedia++;

                    console.log(
                        "Mídia já cadastrada por outra operação:",
                        media.id,
                        file.filePath
                    );
                }

                await registerAuditLog({
                    entity: "Media",
                    entityId: media.id,
                    action: "create",
                    description: `Mídia ${file.mediaType} cadastrada.`,
                    changes: {
                        fileHash,
                        mediaType: file.mediaType,
                        thumbnailPath
                    }
                });

                result.newMedia++;
            }

            const normalizedFilePath = normalizePath(file.filePath);

            const existingLocation = locationsByPath.get(normalizedFilePath) ?? null;

            if (existingLocation) {
                const previousMediaId = existingLocation.mediaId;

                const previousValues = {
                    mediaId: existingLocation.mediaId,
                    setId: existingLocation.setId,
                    minisetId: existingLocation.minisetId,
                    filePath: existingLocation.filePath,
                    fileName: existingLocation.fileName,
                    extension: existingLocation.extension,
                    fileSize: existingLocation.fileSize
                };

                const newValues = {
                    mediaId: media.id,
                    setId,
                    minisetId: findMinisetId(file.filePath),
                    filePath: file.filePath,
                    fileName: file.fileName,
                    extension: file.extension,
                    fileSize: file.fileSize
                };

                const changes: Record<string, { old: any; new: any }> = {};

                for (const key of Object.keys(newValues) as Array<keyof typeof newValues>) {
                    if (previousValues[key] !== newValues[key]) {
                        changes[key] = {
                            old: previousValues[key],
                            new: newValues[key]
                        };
                    }
                }

                await existingLocation.update(newValues);

                if (Object.keys(changes).length > 0) {
                    await registerAuditLog({
                        entity: "MediaLocation",
                        entityId: existingLocation.id,
                        action: "update",
                        description: `Localização da mídia "${file.fileName}" atualizada.`,
                        changes
                    });
                }

                locationsByPath.set(normalizedFilePath, existingLocation);

                if (previousMediaId !== media.id) {
                    const remainingLocations = await MediaLocation.count({
                        where: {
                            mediaId: previousMediaId
                        }
                    });

                    if (remainingLocations === 0) {
                        const removedMedia = await Media.findByPk(previousMediaId);

                        if (removedMedia) {
                            await registerAuditLog({
                                entity: "Media",
                                entityId: removedMedia.id,
                                action: "delete",
                                description: "Mídia removida por não possuir mais localizações.",
                                changes: {
                                    fileHash: removedMedia.fileHash,
                                    mediaType: removedMedia.mediaType,
                                    thumbnailPath: removedMedia.thumbnailPath
                                }
                            });

                            await removedMedia.destroy();
                        }
                    }
                }
            } else {
                const newLocation = await MediaLocation.create({
                    mediaId: media.id,
                    setId,
                    minisetId: findMinisetId(file.filePath),
                    filePath: file.filePath,
                    fileName: file.fileName,
                    extension: file.extension,
                    fileSize: file.fileSize
                });

                await registerAuditLog({
                    entity: "MediaLocation",
                    entityId: newLocation.id,
                    action: "create",
                    description: `Localização da mídia "${file.fileName}" cadastrada no Set "${gallerySet.name}".`,
                    changes: {
                        mediaId: media.id,
                        setId,
                        minisetId: findMinisetId(file.filePath),
                        filePath: file.filePath,
                        fileName: file.fileName,
                        extension: file.extension,
                        fileSize: file.fileSize
                    }
                });

                locationsByPath.set(normalizedFilePath, newLocation);

                result.newLocations++;
            }

        } catch (error) {
            console.error(
                `Erro ao indexar ${file.filePath}:`,
                error
            );

            result.errors++;
        }
    }

    if (result.errors === 0) {
        for (const location of existingLocations) {
            if (!scannedPaths.has(normalizePath(location.filePath))) {
                await registerAuditLog({
                    entity: "MediaLocation",
                    entityId: location.id,
                    action: "delete",
                    description: `Localização da mídia "${location.fileName}" removida do Set "${gallerySet.name}" durante a reindexação.`,
                    changes: {
                        mediaId: location.mediaId,
                        setId: location.setId,
                        minisetId: location.minisetId,
                        filePath: location.filePath,
                        fileName: location.fileName,
                        extension: location.extension,
                        fileSize: location.fileSize
                    }
                });

                await location.destroy();

                const remainingLocations = await MediaLocation.count({
                    where: {
                        mediaId: location.mediaId
                    }
                });

                if (remainingLocations === 0) {
                    const removedMedia = await Media.findByPk(location.mediaId);

                    if (removedMedia) {
                        await registerAuditLog({
                            entity: "Media",
                            entityId: removedMedia.id,
                            action: "delete",
                            description: `Mídia removida por não possuir mais localizações.`,
                            changes: {
                                fileHash: removedMedia.fileHash,
                                mediaType: removedMedia.mediaType,
                                thumbnailPath: removedMedia.thumbnailPath
                            }
                        });

                        await removedMedia.destroy();
                    }
                }
            }
        }
    }

    return result;
}
