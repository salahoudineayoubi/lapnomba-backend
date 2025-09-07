import { Sequelize } from 'sequelize';
import { envConfig } from './env';
import { User, initializeUser } from '../models/user';
import { initializeMenu } from '../models/menu';
import { initializeProjet } from '../models/projet';
import { initializeFormation } from '../models/formation';
import { initializeInscriptionFormation } from '../models/inscription_formation';
import { initializeNewsletterSubscriber } from '../models/sewsletter_subscriber';
import { initializeDon } from '../models/don';
import { initializeContactMessage } from '../models/contact_message';
import { initializeEquipeMembre } from '../models/equipe_membre';
import { initializePartenaires } from '../models/partenaires';
import bcrypt from 'bcrypt';

const dbUrl = `${envConfig.DB_PROTOCOL}://${envConfig.DB_USER}:${envConfig.DB_PASSWORD}@${envConfig.DB_HOST}:${envConfig.DB_PORT}/${envConfig.DB_NAME}`;
export const sequelize = new Sequelize(dbUrl, { logging: false });

// Initialisation des modèles
initializeUser(sequelize);
initializeMenu(sequelize);
initializeProjet(sequelize);
initializeFormation(sequelize);
initializeInscriptionFormation(sequelize);
initializeNewsletterSubscriber(sequelize);
initializeDon(sequelize);
initializeContactMessage(sequelize);
initializeEquipeMembre(sequelize);
initializePartenaires(sequelize);

export { User };

// Fonction pour initialiser la DB et l’admin
export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected!');

    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronized!');

    const admin = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD!, parseInt(process.env.SALT_ROUNDS || '10'));
      await User.create({
        nom: 'Admin',
        prenom: 'Admin',
        email: process.env.ADMIN_EMAIL!,
        password: hashedPassword,
        role: 'admin',
        telephone: '',
        ville: '',
        niveauEtude: '',
        dateNaissance: new Date()
      });
      console.log('✅ Admin created');
    }
  } catch (err: any) {
    console.error('❌ Database init error:', err.message);
  }
}
