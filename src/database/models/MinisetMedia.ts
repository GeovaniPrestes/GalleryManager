import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

interface MinisetMediaAttributes {
    id: number;
    minisetId: number;
    mediaId: number;
}

interface MinisetMediaCreationAttributes extends Optional<
    MinisetMediaAttributes,
    "id"
> { }

class MinisetMedia extends SequelizeModel<
    MinisetMediaAttributes,
    MinisetMediaCreationAttributes
> implements MinisetMediaAttributes {
    declare id: number;
    declare minisetId: number;
    declare mediaId: number;
}

MinisetMedia.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        minisetId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "minisets",
                key: "id"
            },
            onDelete: "CASCADE"
        },
        mediaId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "media",
                key: "id"
            },
            onDelete: "CASCADE"
        }
    },
    {
        sequelize: createDatabase(),
        tableName: "miniset_media",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["minisetId", "mediaId"]
            }
        ]
    }
);

export default MinisetMedia;