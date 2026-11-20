import { stat } from "node:fs/promises";
import GallerySet from "../../database/models/GallerySet";

export async function validateSetFolders(): Promise<number[]> {
    const sets = await GallerySet.findAll({
        attributes: ["id", "name", "folderPath"]
    });

    let unavailableCount = 0;
    const unavailableSetIds: number[] = [];

    for (const gallerySet of sets) {
        try {
            const folderStats = await stat(gallerySet.folderPath);

            if (!folderStats.isDirectory()) {
                throw new Error("O caminho não é uma pasta.");
            }
        } catch (error) {
            unavailableCount++;
            unavailableSetIds.push(gallerySet.id);

            console.warn(
                `[Set indisponível] ID: ${gallerySet.id} | ` +
                `Nome: ${gallerySet.name} | ` +
                `Caminho: ${gallerySet.folderPath}`,
                error
            );
        }
    }

    console.log(
        `Verificação de pastas concluída: ${sets.length} Sets verificados, ` +
        `${unavailableCount} indisponíveis.`
    );

    return unavailableSetIds;
}
