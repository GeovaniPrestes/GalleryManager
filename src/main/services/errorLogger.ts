
import { app } from "electron";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

interface ErrorLogData {
    operation: string;
    message: string;
    entity?: string;
    entityId?: number;
    filePath?: string;
    details?: unknown;
}

export async function registerErrorLog(data: ErrorLogData): Promise<void> {
    try {
        const logsDirectory = join(app.getPath("userData"), "logs");

        await mkdir(logsDirectory, { recursive: true });

        const now = new Date();

        const date = now.toLocaleDateString("sv-SE");
        const time = now.toLocaleTimeString("pt-BR", {
            hour12: false
        });

        const logFile = join(logsDirectory, `errors-${date}.log`);

        const errorDetails = data.details instanceof Error
            ? data.details.stack || data.details.message
            : data.details
                ? JSON.stringify(data.details)
                : "Nenhum detalhe adicional.";

        const logEntry = [
            "========================================",
            `Data: ${date} ${time}`,
            `Operação: ${data.operation}`,
            `Entidade: ${data.entity ?? "Não informada"}`,
            `ID: ${data.entityId ?? "Não informado"}`,
            `Arquivo: ${data.filePath ?? "Não informado"}`,
            `Erro: ${data.message}`,
            `Detalhes: ${errorDetails}`,
            ""
        ].join("\n");

        await appendFile(logFile, logEntry, "utf-8");

    } catch (error) {
        console.error("Não foi possível salvar o log de erro:", error);
    }
}
