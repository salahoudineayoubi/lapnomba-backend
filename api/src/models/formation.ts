import {
  DataTypes, type CreationOptional, type InferAttributes, type InferCreationAttributes, Sequelize, Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';

export class Formation extends Model<InferAttributes<Formation>, InferCreationAttributes<Formation>> {
  declare id: CreationOptional<bigint>;
  declare titre: string;
  declare description: string;
  declare categorie: string;
  declare dateDebut: Date;
  declare dateFin: Date;
  declare isActive: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeFormation(sequelize: Sequelize) {
  Formation.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    titre: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    categorie: { type: DataTypes.STRING, allowNull: false },
    dateDebut: { type: DataTypes.DATE, allowNull: false, field: 'date_debut' },
    dateFin: { type: DataTypes.DATE, allowNull: false, field: 'date_fin' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    ...timestampAttributes,
  }, { sequelize, ...defaultOptions });
}