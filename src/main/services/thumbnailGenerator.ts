import sharp from "sharp";
import { app } from "electron";
import { join, extname } from "node:path";
import { mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

export async function generateThumbnail(
    originalPath: string
): Promise<string> {
    const thumbnailDirectory = join(
        app.getPath("userData"),
        "thumbnails"
    );

    await mkdir(thumbnailDirectory, { recursive: true });

    const fileHash = createHash("sha256")
        .update(originalPath.toLowerCase())
        .digest("hex");

    const thumbnailPath = join(
        thumbnailDirectory,
        `${fileHash}.webp`
    );

    await sharp(originalPath)
        .rotate()
        .resize(400, 400, {
            fit: "inside",
            withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);

    return thumbnailPath;
}

export async function generateThumbnailFromFolder(
    folderPath: string
): Promise<string | null> {
    const entries = await readdir(folderPath, {
        withFileTypes: true
    });

    const supportedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".avif",
        ".tiff",
        ".gif"
    ];

    const image = entries.find((entry) => {
        return (
            entry.isFile() &&
            supportedExtensions.includes(
                extname(entry.name).toLowerCase()
            )
        );
    });

    if (!image) {
        return null;
    }

    const imagePath = join(folderPath, image.name);

    return generateThumbnail(imagePath);
}
