import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface ScannedMiniset {
  name: string;
  folderPath: string;
  parentPath: string | null;
}

export async function scanMinisetFolders(
  rootPath: string
): Promise<ScannedMiniset[]> {
  const minisets: ScannedMiniset[] = [];

  async function scanDirectory(
    currentPath: string,
    parentPath: string | null
  ): Promise<void> {
    const entries = await readdir(currentPath, {
      withFileTypes: true
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const folderPath = join(currentPath, entry.name);

      minisets.push({
        name: entry.name,
        folderPath,
        parentPath
      });

      await scanDirectory(folderPath, folderPath);
    }
  }

  await scanDirectory(rootPath, null);

  return minisets;
}
