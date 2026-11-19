
import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

interface MediaAttributes {
    id: number;
    fileHash: string | null;
    mediaType: "image" | "video";
    thumbnailPath: string | null;
}

interface MediaCreationAttributes extends Optional<
    MediaAttributes,
    "id" | "fileHash" | "thumbnailPath"
> { }

class Media extends SequelizeModel<
    MediaAttributes,
    MediaCreationAttributes
> implements MediaAttributes {
    declare id: number;
    declare fileHash: string | null;
    declare mediaType: "image" | "video";
    declare thumbnailPath: string | null;
}

Media.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        fileHash: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        mediaType: {
            type: DataTypes.ENUM("image", "video"),
            allowNull: false
        },
        thumbnailPath: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize: createDatabase(),
        tableName: "media",
        timestamps: true
    }
);

export default Media;
