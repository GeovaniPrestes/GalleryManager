import {
    DataTypes,
    Model as SequelizeModel,
    Optional
} from "sequelize";

import { createDatabase } from "../connection";

const database = createDatabase();

interface AuditLogAttributes {
    id: number;
    entity: string;
    entityId: number | null;
    action: string;
    description: string;
    changes: string | null;
    createdAt?: Date;
}

interface AuditLogCreationAttributes
    extends Optional<
        AuditLogAttributes,
        "id" | "entityId" | "changes"
    > { }

class AuditLog
    extends SequelizeModel<
        AuditLogAttributes,
        AuditLogCreationAttributes
    >
    implements AuditLogAttributes {

    declare id: number;
    declare entity: string;
    declare entityId: number | null;
    declare action: string;
    declare description: string;
    declare changes: string | null;
    declare readonly createdAt: Date;
}

AuditLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        entity: {
            type: DataTypes.STRING,
            allowNull: false
        },
        entityId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        changes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        sequelize: database,
        tableName: "audit_logs",
        timestamps: true,
        updatedAt: false
    }
);

export default AuditLog;
