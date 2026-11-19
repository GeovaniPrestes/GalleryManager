import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

const database = createDatabase();

interface MinisetAttributes {
    id: number;
    name: string;
    folderPath: string;
    parentId: number | null;
    setId: number;
    thumbnailPath: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MinisetCreationAttributes
    extends Optional<
        MinisetAttributes,
        "id" | "parentId" | "thumbnailPath"
    > { }

class Miniset
    extends SequelizeModel<
        MinisetAttributes,
        MinisetCreationAttributes
    >
    implements MinisetAttributes {
    declare id: number;
    declare name: string;
    declare folderPath: string;
    declare parentId: number | null;
    declare setId: number;
    declare thumbnailPath: string | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Miniset.init(
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
        folderPath: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "minisets",
                key: "id"
            },
            onDelete: "CASCADE"
        },
        setId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "sets",
                key: "id"
            },
            onDelete: "CASCADE"
        },
        thumbnailPath: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize: database,
        tableName: "minisets",
        timestamps: true
    }
);

export default Miniset;
