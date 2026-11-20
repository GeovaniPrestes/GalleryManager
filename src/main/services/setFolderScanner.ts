import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface ScannedSetFolder {
    name: string;
    folderPath: string;
}

export async function scanSetFolders(
    modelFolderPath: string
): Promise<ScannedSetFolder[]> {
    const entries = await readdir(modelFolderPath, {
        withFileTypes: true
    });

    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            name: entry.name,
            folderPath: join(modelFolderPath, entry.name)
        }))
        .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base"
            })
        );
}