import Media from "../../../database/models/Media";
import MediaLocation from "../../../database/models/MediaLocation";
import GallerySet from "../../../database/models/GallerySet";
import Miniset from "../../../database/models/Miniset";


import { scanMediaFolder } from "./mediaScanner";
import { calculateFileHash } from "./mediaHash";

export interface MediaIndexResult {
    totalFiles: number;
    newMedia: number;
    newLocations: number;
    existingMedia: number;
    errors: number;
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
        scannedFiles.map(file => file.filePath.toLowerCase())
    );

    const existingLocations = await MediaLocation.findAll({
        include: [
            {
                model: Media,
                as: "media",
                required: true,
                include: [
                    {
                        model: GallerySet,
                        as: "sets",
                        where: {
                            id: setId
                        },
                        through: {
                            attributes: []
                        },
                        required: true
                    }
                ]
            }
        ]
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
        const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/");

        let matchedId: number | null = null;
        let longestPathLength = 0;

        for (const [folderPath, minisetId] of minisetPaths) {
            const normalizedFolder = folderPath.replace(/\\/g, "/");

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
            } else {
                media = await Media.create({
                    fileHash,
                    mediaType: file.mediaType
                });

                result.newMedia++;
            }

            const existingLocation = await MediaLocation.findOne({
                where: {
                    filePath: file.filePath
                }
            });

            if (existingLocation) {
                await existingLocation.update({
                    mediaId: media.id,
                    setId,
                    minisetId: findMinisetId(file.filePath),
                    fileName: file.fileName,
                    extension: file.extension,
                    fileSize: file.fileSize
                });
            } else {
                await MediaLocation.create({
                    mediaId: media.id,
                    setId,
                    minisetId: findMinisetId(file.filePath),
                    filePath: file.filePath,
                    fileName: file.fileName,
                    extension: file.extension,
                    fileSize: file.fileSize
                });

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

    return result;
}
