import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

export interface ScannedMedia {
    filePath: string;
    fileName: string;
    extension: string;
    fileSize: number;
    mediaType: "image" | "video";
}

const imageExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".avif",
    ".tiff",
    ".gif",
    ".bmp"
]);

const videoExtensions = new Set([
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".wmv",
    ".webm",
    ".m4v",
    ".mpeg",
    ".mpg"
]);

export async function scanMediaFolder(
    rootPath: string
): Promise<ScannedMedia[]> {
    const mediaFiles: ScannedMedia[] = [];

    async function scanDirectory(directoryPath: string): Promise<void> {
        const entries = await readdir(directoryPath, {
            withFileTypes: true
        });

        for (const entry of entries) {
            const filePath = join(directoryPath, entry.name);

            if (entry.isDirectory()) {
                await scanDirectory(filePath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const extension = extname(entry.name).toLowerCase();

            let mediaType: "image" | "video" | null = null;

            if (imageExtensions.has(extension)) {
                mediaType = "image";
            } else if (videoExtensions.has(extension)) {
                mediaType = "video";
            }

            if (!mediaType) {
                continue;
            }

            const fileStats = await stat(filePath);

            mediaFiles.push({
                filePath,
                fileName: entry.name,
                extension,
                fileSize: fileStats.size,
                mediaType
            });
        }
    }

    await scanDirectory(rootPath);

    return mediaFiles;
}

export interface MediaIndexCheckResult {
    setId: number;
    totalFiles: number;
    registeredFiles: number;
    newFiles: number;
    removedFiles: number;
    changedFiles: number;
    status: "pending" | "error" | "changed" | "indexed";
    needsIndexing: boolean;
}
