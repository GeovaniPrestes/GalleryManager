import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

const database = createDatabase();

interface ModelAttributes {
    id: number;
    name: string;
    description: string | null;
    thumbnailPath: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ModelCreationAttributes
    extends Optional<
        ModelAttributes,
        "id" | "description" | "thumbnailPath"
    > { }

class Model
    extends SequelizeModel<
        ModelAttributes,
        ModelCreationAttributes
    >
    implements ModelAttributes {

    declare id: number;
    declare name: string;
    declare description: string | null;
    declare thumbnailPath: string | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Model.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        thumbnailPath: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize: database,
        tableName: "models",
        timestamps: true
    }
);

export default Model;
