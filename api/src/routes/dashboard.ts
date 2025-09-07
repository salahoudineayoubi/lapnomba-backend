import { Router } from 'express';
import { User } from '../models/user';
import { Menu } from '../models/menu';
import { Projet } from '../models/projet';
import { Formation } from '../models/formation';
import { InscriptionFormation } from '../models/inscription_formation';
import { NewsletterSubscriber } from '../models/sewsletter_subscriber';
import { Don } from '../models/don';
import { ContactMessage } from '../models/contact_message';
import { EquipeMembre } from '../models/equipe_membre';
import { Partenaires } from '../models/partenaires';

const router = Router();

/**
 * Route /dashboard/stats
 * Retourne le nombre total de chaque modèle
 */
router.get('/stats', async (req, res) => {
  try {
    const [users, menus, projets, formations, inscriptions, newsletters, dons, contacts, equipe, partenaires] = await Promise.all([
      User.count(),
      Menu.count(),
      Projet.count(),
      Formation.count(),
      InscriptionFormation.count(),
      NewsletterSubscriber.count(),
      Don.count(),
      ContactMessage.count(),
      EquipeMembre.count(),
      Partenaires.count(),
    ]);

    res.json({
      users,
      menus,
      projets,
      formations,
      inscriptions,
      newsletters,
      dons,
      contacts,
      equipe,
      partenaires,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

/**
 * Route /dashboard/recent
 * Retourne les derniers utilisateurs et menus (limit 5)
 */
router.get('/recent', async (req, res) => {
  try {
    const [recentUsers, recentMenus] = await Promise.all([
      User.findAll({ order: [['createdAt', 'DESC']], limit: 5 }),
      Menu.findAll({ order: [['createdAt', 'DESC']], limit: 5 }),
    ]);

    res.json({ users: recentUsers, menus: recentMenus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recent items.' });
  }
});

/**
 * Route /dashboard/visits
 * Retourne le nombre de visiteurs (ici placeholder)
 * Si tu as une table visits, tu peux la remplacer ici
 */
router.get('/visits', async (req, res) => {
  try {
    // TODO: Remplacer par le vrai comptage de visiteurs si tu as une table dédiée
    const visitsCount = 0;
    res.json({ count: visitsCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visits.' });
  }
});

export default router;
