import {
  DataTypes, type CreationOptional, type InferAttributes, type InferCreationAttributes, Sequelize, Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';

export class Menu extends Model<InferAttributes<Menu>, InferCreationAttributes<Menu>> {
  declare id: CreationOptional<bigint>;
  declare titre: string;
  declare slug: string;
  declare ordre: number;
  declare parentId: number | null;
  declare isActive: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeMenu(sequelize: Sequelize) {
  Menu.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    titre: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    ordre: { type: DataTypes.INTEGER, defaultValue: 0 },
    parentId: { type: DataTypes.INTEGER, allowNull: true, field: 'parent_id' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  }, { 
    sequelize, 
    modelName: 'Menu',
    tableName: 'menus',
    ...defaultOptions });

  // Relation pour les sous-menus
  Menu.hasMany(Menu, { as: 'children', foreignKey: 'parentId' });
  Menu.belongsTo(Menu, { as: 'parent', foreignKey: 'parentId' });
}