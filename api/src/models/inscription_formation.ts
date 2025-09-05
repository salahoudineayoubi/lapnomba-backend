import {
  DataTypes, type CreationOptional, type InferAttributes, type InferCreationAttributes, Sequelize, Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';
import { User } from './user';
import { Formation } from './formation';

export class InscriptionFormation extends Model<InferAttributes<InscriptionFormation>, InferCreationAttributes<InscriptionFormation>> {
  declare id: CreationOptional<bigint>;
  declare userId: bigint;
  declare formationId: bigint;
  declare statut: string;
  declare dateInscription: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeInscriptionFormation(sequelize: Sequelize) {
  InscriptionFormation.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
    formationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'formation_id' },
    statut: { type: DataTypes.STRING, allowNull: false },
    dateInscription: { type: DataTypes.DATE, allowNull: false, field: 'date_inscription' },
    ...timestampAttributes,
  }, { sequelize, ...defaultOptions });

  // Relations
  User.hasMany(InscriptionFormation, { foreignKey: 'userId' });
  InscriptionFormation.belongsTo(User, { foreignKey: 'userId' });

  Formation.hasMany(InscriptionFormation, { foreignKey: 'formationId' });
  InscriptionFormation.belongsTo(Formation, { foreignKey: 'formationId' });
}