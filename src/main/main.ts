import { app, BrowserWindow, protocol, net } from "electron";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createDatabase } from "../database/connection";
import { runMigrations } from "../database/migrator";
import { isPreviewPathAllowed } from "./services/previewAccess";
import Model from "../database/models/Model";
import { registerModelHandlers } from "./modelHandlers";
import GallerySet from "../database/models/GallerySet";
import { registerSetHandlers } from "./setHandlers";
import SetModel from "../database/models/SetModel";
import Miniset from "../database/models/Miniset";
import Media from "../database/models/Media";
import MediaLocation from "../database/models/MediaLocation";
import { registerMediaHandlers } from "./mediaHandlers";
import AuditLog from "../database/models/AuditLog";

protocol.registerSchemesAsPrivileged([
    {
        scheme: "media",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true
        }
    },
    {
        scheme: "preview",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true
        }
    }
]);

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 650,
        backgroundColor: "#111318",

        webPreferences: {
            preload: join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (!app.isPackaged) {
        mainWindow.loadURL("http://127.0.0.1:5173");
    } else {
        mainWindow.loadFile(
            join(__dirname, "../../renderer/index.html")
        );
    }
}

app.whenReady().then(async () => {
    protocol.handle("media", async (request) => {

        const url = new URL(request.url);
        const filePath = url.searchParams.get("path");

        if (!filePath) {
            return new Response("Caminho não informado.", {
                status: 400
            });
        }

        const thumbnailDirectory = resolve(
            app.getPath("userData"),
            "thumbnails"
        );

        const resolvedPath = resolve(filePath);

        if (!resolvedPath.startsWith(thumbnailDirectory + sep)) {
            return new Response("Acesso negado.", {
                status: 403
            });
        }

        return net.fetch(
            pathToFileURL(resolvedPath).toString()
        );
    });

    protocol.handle("preview", async (request) => {
        const url = new URL(request.url);
        const filePath = url.searchParams.get("path");

        if (!filePath) {
            return new Response("Caminho não informado.", {
                status: 400
            });
        }

        if (!isPreviewPathAllowed(filePath)) {
            return new Response("Acesso negado.", {
                status: 403
            });
        }

        const resolvedPath = resolve(filePath);

        return net.fetch(
            pathToFileURL(resolvedPath).toString()
        );
    });

    try {
        const database = createDatabase();
        await database.authenticate();

        Model.belongsToMany(GallerySet, {
            through: SetModel,
            foreignKey: "modelId",
            otherKey: "setId",
            as: "sets"
        });

        GallerySet.belongsToMany(Model, {
            through: SetModel,
            foreignKey: "setId",
            otherKey: "modelId",
            as: "models"
        });

        GallerySet.hasMany(Miniset, {
            foreignKey: "setId",
            as: "minisets",
            onDelete: "CASCADE"
        });

        Miniset.belongsTo(GallerySet, {
            foreignKey: "setId",
            as: "set"
        });

        Miniset.hasMany(Miniset, {
            foreignKey: "parentId",
            as: "children",
            onDelete: "CASCADE"
        });

        Miniset.belongsTo(Miniset, {
            foreignKey: "parentId",
            as: "parent"
        });

        Media.hasMany(MediaLocation, {
            foreignKey: "mediaId",
            as: "locations",
            onDelete: "CASCADE"
        });

        MediaLocation.belongsTo(Media, {
            foreignKey: "mediaId",
            as: "media"
        });

        MediaLocation.belongsTo(GallerySet, {
            foreignKey: "setId",
            as: "gallerySet"
        });

        MediaLocation.belongsTo(Miniset, {
            foreignKey: "minisetId",
            as: "miniset"
        });

        GallerySet.hasMany(MediaLocation, {
            foreignKey: "setId",
            as: "mediaLocations"
        });

        Miniset.hasMany(MediaLocation, {
            foreignKey: "minisetId",
            as: "mediaLocations"
        });

        await Model.sync();
        await GallerySet.sync();
        await SetModel.sync();
        await Miniset.sync();
        await Media.sync();
        await MediaLocation.sync();
        await AuditLog.sync();

        console.log("Verificando migrations pendentes...");

        const executedMigrations = await runMigrations();

        console.log(
            `${executedMigrations.length} migration(s) executada(s).`
        );

        registerModelHandlers();
        registerSetHandlers();
        registerMediaHandlers();

        console.log("Banco SQLite conectado com sucesso!");
    } catch (error) {
        console.error("Erro ao conectar ao banco SQLite:", error);
    }

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
