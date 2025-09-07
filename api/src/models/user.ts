import {
  DataTypes,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  Sequelize,
  Model,
} from 'sequelize';
import { defaultOptions, timestampAttributes } from './base-model';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare nom: string;
  declare prenom: string;
  declare email: string;
  declare password: string;
  declare role: string;
  declare telephone: string;
  declare ville: string;
  declare niveauEtude: string;
  declare dateNaissance: Date; 
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeUser(sequelize: Sequelize) {
  User.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true }, // PostgreSQL ignore UNSIGNED
      nom: { type: DataTypes.STRING, allowNull: false },
      prenom: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false },
      telephone: { type: DataTypes.STRING },
      ville: { type: DataTypes.STRING },
      niveauEtude: { type: DataTypes.STRING },
      dateNaissance: { type: DataTypes.DATEONLY }, 
      ...timestampAttributes,
    },
    { 
      sequelize, 
      modelName: 'User',
      tableName: 'users',
      ...defaultOptions 
    }
  );

 User.addHook('beforeDestroy', (user, options) => {
  const u = user as User; // cast pour TypeScript
  if (u.email === process.env.ADMIN_EMAIL) {
    throw new Error("❌ L'admin ne peut pas être supprimé !");
  }
});
}
