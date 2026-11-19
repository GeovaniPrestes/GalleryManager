import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

const database = createDatabase();

interface GallerySetAttributes {
    id: number;
    name: string;
    description: string | null;
    folderPath: string;
    thumbnailPath: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface GallerySetCreationAttributes
    extends Optional<
        GallerySetAttributes,
        "id" | "description" | "thumbnailPath"
    > { }

class GallerySet
    extends SequelizeModel<
        GallerySetAttributes,
        GallerySetCreationAttributes
    >
    implements GallerySetAttributes {
    declare id: number;
    declare name: string;
    declare description: string | null;
    declare folderPath: string;
    declare thumbnailPath: string | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

GallerySet.init(
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
        folderPath: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        thumbnailPath: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize: database,
        tableName: "sets",
        timestamps: true
    }
);

export default GallerySet;
