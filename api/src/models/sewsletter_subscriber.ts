import {
  DataTypes, type CreationOptional, type InferAttributes, type InferCreationAttributes, Sequelize, Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';

export class NewsletterSubscriber extends Model<InferAttributes<NewsletterSubscriber>, InferCreationAttributes<NewsletterSubscriber>> {
  declare id: CreationOptional<bigint>;
  declare email: string;
  declare dateInscription: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeNewsletterSubscriber(sequelize: Sequelize) {
  NewsletterSubscriber.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    dateInscription: { type: DataTypes.DATE, allowNull: false, field: 'date_inscription' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  }, { sequelize, ...defaultOptions });
}