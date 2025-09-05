import {
  DataTypes, type CreationOptional, type InferAttributes, type InferCreationAttributes, Sequelize, Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';
import { User } from './user';

export class Don extends Model<InferAttributes<Don>, InferCreationAttributes<Don>> {
  declare id: CreationOptional<bigint>;
  declare userId: bigint;
  declare montant: number;
  declare message: string;
  declare dateDon: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeDon(sequelize: Sequelize) {
  Don.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    montant: { type: DataTypes.FLOAT, allowNull: false },
    message: { type: DataTypes.TEXT },
    dateDon: { type: DataTypes.DATE, allowNull: false, field: 'date_don' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  }, { sequelize, ...defaultOptions });

  User.hasMany(Don, { foreignKey: 'userId' });
  Don.belongsTo(User, { foreignKey: 'userId' });
}