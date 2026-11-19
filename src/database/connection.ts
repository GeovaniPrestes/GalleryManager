import { app } from "electron";
import { Sequelize } from "sequelize";
import { join } from "node:path";

let database: Sequelize | null = null;

export function createDatabase(): Sequelize {
    if (database) {
        return database;
    }

    const databasePath = join(
        app.getPath("userData"),
        "galerymanager.sqlite"
    );

    database = new Sequelize({
        dialect: "sqlite",
        storage: databasePath,
        logging: false
    });

    return database;
}
