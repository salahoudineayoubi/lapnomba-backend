import express from 'express';
import { AppDataSource } from '../../data-source';
import { NewsletterSubscribe } from '../../models/newsletter_subscribe';

const router = express.Router();
const newsletterRepo = AppDataSource.getRepository(NewsletterSubscribe);

// S'abonner à la newsletter
router.post('/', async (req, res, next) => {
  try {
    const { email } = req.body;
    const subscription = newsletterRepo.create({ email });
    await newsletterRepo.save(subscription);
    res.status(201).json(subscription);
  } catch (err) {
    next(err);
  }
});

// Lister les abonnés (optionnel)
router.get('/', async (req, res) => {
  try {
    const subscribers = await newsletterRepo.find();
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;