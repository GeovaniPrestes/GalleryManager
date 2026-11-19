import { Umzug, SequelizeStorage } from "umzug";
import { join } from "node:path";
import { createDatabase } from "./connection";

const database = createDatabase();

const migrator = new Umzug({
    migrations: {
        glob: join(__dirname, "migrations", "*.js").replace(/\\/g, "/")
    },
    context: database.getQueryInterface(),
    storage: new SequelizeStorage({
        sequelize: database
    }),
    logger: console
});

export async function runMigrations() {
    return migrator.up();
}
