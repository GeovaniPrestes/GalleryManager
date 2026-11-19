import { resolve } from "node:path";

const allowedPreviewPaths = new Set<string>();

export function allowPreviewPath(filePath: string): void {
    allowedPreviewPaths.add(resolve(filePath).toLowerCase());
}

export function isPreviewPathAllowed(filePath: string): boolean {
    return allowedPreviewPaths.has(resolve(filePath).toLowerCase());
}