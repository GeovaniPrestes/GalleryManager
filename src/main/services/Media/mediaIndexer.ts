import Media from "../../../database/models/Media";
import MediaLocation from "../../../database/models/MediaLocation";
import GallerySet from "../../../database/models/GallerySet";
import Miniset from "../../../database/models/Miniset";
import { generateThumbnail } from "../thumbnailGenerator";

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

                if (
                    file.mediaType === "image" &&
                    !media.thumbnailPath
                ) {
                    console.log("Gerando thumbnail para:", file.filePath);
                    const thumbnailPath = await generateThumbnail(
                        file.filePath
                    );

                    await media.update({
                        thumbnailPath
                    });
                }
            } else {
                const thumbnailPath = file.mediaType === "image"
                    ? await generateThumbnail(file.filePath)
                    : null;

                media = await Media.create({
                    fileHash,
                    mediaType: file.mediaType,
                    thumbnailPath
                });

                result.newMedia++;
            }

            const normalizedFilePath = normalizePath(file.filePath);

            const existingLocation = locationsByPath.get(normalizedFilePath) ?? null;

            if (existingLocation) {
                const previousMediaId = existingLocation.mediaId;

                await existingLocation.update({
                    mediaId: media.id,
                    setId,
                    minisetId: findMinisetId(file.filePath),
                    filePath: file.filePath,
                    fileName: file.fileName,
                    extension: file.extension,
                    fileSize: file.fileSize
                });

                locationsByPath.set(normalizedFilePath, existingLocation);

                if (previousMediaId !== media.id) {
                    const remainingLocations = await MediaLocation.count({
                        where: {
                            mediaId: previousMediaId
                        }
                    });

                    if (remainingLocations === 0) {
                        await Media.destroy({
                            where: {
                                id: previousMediaId
                            }
                        });
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
                await location.destroy();

                const remainingLocations = await MediaLocation.count({
                    where: {
                        mediaId: location.mediaId
                    }
                });

                if (remainingLocations === 0) {
                    await Media.destroy({
                        where: {
                            id: location.mediaId
                        }
                    });
                }
            }
        }
    }

    return result;
}
