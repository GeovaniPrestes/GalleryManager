import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

interface SetMediaAttributes {
    id: number;
    setId: number;
    mediaId: number;
}

interface SetMediaCreationAttributes extends Optional<
    SetMediaAttributes,
    "id"
> {}

class SetMedia extends SequelizeModel<
    SetMediaAttributes,
    SetMediaCreationAttributes
> implements SetMediaAttributes {
    declare id: number;
    declare setId: number;
    declare mediaId: number;
}

SetMedia.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
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
        tableName: "set_media",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["setId", "mediaId"]
            }
        ]
    }
);

export default SetMedia;