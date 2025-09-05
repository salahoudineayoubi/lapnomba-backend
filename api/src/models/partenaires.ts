import {
  DataTypes, type CreationOptional, type InferAttributes, type InferCreationAttributes, Sequelize, Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';

export class Partenaires extends Model<InferAttributes<Partenaires>, InferCreationAttributes<Partenaires>> {
  declare id: CreationOptional<bigint>;
  declare nom: string;
  declare description: string;
  declare logoUrl: string;
  declare siteUrl: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializePartenaires(sequelize: Sequelize) {
  Partenaires.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    nom: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    logoUrl: { type: DataTypes.STRING, allowNull: true, field: 'logo_url' },
    siteUrl: { type: DataTypes.STRING, allowNull: true, field: 'site_url' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  }, { sequelize, ...defaultOptions });
}