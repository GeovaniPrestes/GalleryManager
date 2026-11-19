import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { createDatabase } from "../database/connection";
import Model from "../database/models/Model";
import { registerModelHandlers } from "./modelHandlers";
import GallerySet from "../database/models/GallerySet";
import { registerSetHandlers } from "./setHandlers";
import SetModel from "../database/models/SetModel";
import Miniset from "../database/models/Miniset";

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

        await Model.sync();
        await GallerySet.sync();
        await SetModel.sync();
        await Miniset.sync();

        registerModelHandlers();
        registerSetHandlers();

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
