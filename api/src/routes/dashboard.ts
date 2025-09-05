import { Router } from 'express';
import { User } from '../models/user';
import { Menu } from '../models/menu';
import { Projet } from '../models/projet';
import { InscriptionFormation } from '../models/inscription_formation';
import { NewsletterSubscriber } from '../models/sewsletter_subscriber';
import { Don } from '../models/don';
import { ContactMessage } from '../models/contact_message';
import { EquipeMembre } from '../models/equipe_membre';
import { Partenaires } from '../models/partenaires';
import { Formation } from '../models/formation';
const router = Router();
router.get('/stats', async (req, res) => {
  try {
    const userCount = await User.count();
    const menuCount = await Menu.count();
    const projetCount = await Projet.count();
    const formationCount = await Formation.count();
    const inscriptionCount = await InscriptionFormation.count();
const newsletterCount = await NewsletterSubscriber.count();
    const donCount = await Don.count();
    const contactCount = await ContactMessage.count();
    const equipeCount = await EquipeMembre.count();
    const partenairesCount = await Partenaires.count();
    res.json({
      users: userCount,
      menus: menuCount,
      projets: projetCount,
      formations: formationCount,
      inscriptions: inscriptionCount,
      newsletters: newsletterCount,
      dons: donCount,
      contacts: contactCount,
      equipe: equipeCount,
      partenaires: partenairesCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
})
export default router;