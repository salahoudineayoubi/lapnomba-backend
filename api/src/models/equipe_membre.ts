import {
  DataTypes, type CreationOptional, type InferAttributes, type InferCreationAttributes, Sequelize, Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';

export class EquipeMembre extends Model<InferAttributes<EquipeMembre>, InferCreationAttributes<EquipeMembre>> {
  declare id: CreationOptional<bigint>;
  declare nom: string;
  declare role: string;
  declare bio: string;
  declare photoUrl: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeEquipeMembre(sequelize: Sequelize) {
  EquipeMembre.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    nom: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    bio: { type: DataTypes.TEXT },
    photoUrl: { type: DataTypes.STRING, field: 'photo_url' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  }, { sequelize, ...defaultOptions });
}