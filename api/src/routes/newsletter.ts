import { Router } from 'express';
import { NewsletterSubscriber } from '../models/sewsletter_subscriber';

const router = Router();

// Inscription à la newsletter
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    const exists = await NewsletterSubscriber.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: "Email already subscribed." });
    }
    const subscriber = await NewsletterSubscriber.create({
      email,
      dateInscription: new Date(),
    });
    res.status(201).json(subscriber);
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// (Optionnel) Liste des abonnés
router.get('/', async (req, res) => {
  try {
    const subscribers = await NewsletterSubscriber.findAll({ order: [['createdAt', 'DESC']] });
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

export default router;