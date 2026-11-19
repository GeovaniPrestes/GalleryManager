import {
    DataTypes,
    Model as SequelizeModel
} from "sequelize";

import { createDatabase } from "../connection";

const database = createDatabase();

class SetModel extends SequelizeModel {
    declare id: number;
    declare setId: number;
    declare modelId: number;
}

SetModel.init(
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
            onDelete: "RESTRICT"
        },
        modelId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "models",
                key: "id"
            },
            onDelete: "RESTRICT"
        }
    },
    {
        sequelize: database,
        tableName: "set_models",
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ["setId", "modelId"]
            }
        ]
    }
);

export default SetModel;
