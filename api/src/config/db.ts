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
const dbUrl = `${envConfig.DB_PROTOCOL}://${envConfig.DB_USER}:${envConfig.DB_PASSWORD}@${envConfig.DB_HOST}:${envConfig.DB_PORT}/${envConfig.DB_NAME}`;
export const sequelize = new Sequelize(dbUrl, {});

// Initialize all models BEFORE sync
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

// Only sync once, then create admin
sequelize.sync({ alter: true })
  .then(async () => {
    console.log('Tables synchronisées !');
    // Confirm users table exists
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('Existing tables:', tables);

    const bcrypt = require('bcrypt');
    async function createAdminIfNotExists() {
      try {
        const admin = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } });
        if (!admin) {
          const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);
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
          console.log('Admin créé');
        }
      } catch (err: any) {
        console.error('Erreur lors de la création de l\'admin ou la table users n\'existe pas :', err.message);
      }
    }
    await createAdminIfNotExists();
  })
  .catch((err) => console.error('Erreur de synchronisation :', err));