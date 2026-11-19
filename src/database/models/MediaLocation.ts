
import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

interface MediaLocationAttributes {
    id: number;
    mediaId: number;
    filePath: string;
    fileName: string;
    extension: string;
    fileSize: number;
    setId: number | null;
    minisetId: number | null;
}

interface MediaLocationCreationAttributes extends Optional<
    MediaLocationAttributes,
    "id" | "setId" | "minisetId"
> { }

class MediaLocation extends SequelizeModel<
    MediaLocationAttributes,
    MediaLocationCreationAttributes
> implements MediaLocationAttributes {
    declare id: number;
    declare mediaId: number;
    declare filePath: string;
    declare fileName: string;
    declare extension: string;
    declare fileSize: number;
    declare setId: number | null;
    declare minisetId: number | null;
}

MediaLocation.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        mediaId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "media",
                key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
        },
        setId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "sets",
                key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
        },
        minisetId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "minisets",
                key: "id"
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
        },
        filePath: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        extension: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fileSize: {
            type: DataTypes.BIGINT,
            allowNull: false
        }
    },
    {
        sequelize: createDatabase(),
        tableName: "media_locations",
        timestamps: true
    }
);

export default MediaLocation;