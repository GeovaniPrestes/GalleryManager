import sharp from "sharp";
import { app } from "electron";
import { join, extname } from "node:path";
import { mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { unlink } from "node:fs/promises";

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static") as string | null;

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

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

export async function generateVideoThumbnail(
    originalPath: string
): Promise<string> {
    if (!ffmpegPath) {
        throw new Error("Executável FFmpeg não encontrado.");
    }

    const thumbnailDirectory = join(
        app.getPath("userData"),
        "thumbnails"
    );

    await mkdir(thumbnailDirectory, { recursive: true });

    const fileHash = createHash("sha256")
        .update(originalPath.toLowerCase())
        .digest("hex");

    const temporaryPath = join(
        thumbnailDirectory,
        `${fileHash}_frame.png`
    );

    const thumbnailPath = join(
        thumbnailDirectory,
        `${fileHash}.webp`
    );

    await new Promise<void>((resolve, reject) => {
        ffmpeg(originalPath)
            .screenshots({
                timestamps: ["00:00:01"],
                filename: `${fileHash}_frame.png`,
                folder: thumbnailDirectory,
                size: "400x?"
            })
            .on("end", resolve)
            .on("error", reject);
    });

    try {
        await sharp(temporaryPath)
            .resize(400, 400, {
                fit: "inside",
                withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(thumbnailPath);
    } finally {
        await unlink(temporaryPath).catch(() => { });
    }

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
