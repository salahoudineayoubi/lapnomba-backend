import { Model, ModelOptions, CreationOptional, DataTypes } from 'sequelize';

// Attributs pour createdAt et updatedAt (utilise DataTypes.DATE pour Sequelize)
export const timestampAttributes = {
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
};

// Options par défaut pour tous les modèles
export const defaultOptions: ModelOptions = {
  timestamps: true,
  underscored: true,
};


export class BaseModel<
  TModelAttributes extends {} = any,
  TCreationAttributes extends {} = any
> extends Model<TModelAttributes, TCreationAttributes> {
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}