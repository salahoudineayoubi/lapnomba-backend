import express from 'express';
import NewsletterSubscribe from '../../models/newsletter_subscribe';

const router = express.Router();

// S'abonner à la newsletter
router.post('/', async (req, res, next) => {
  try {
    const { email } = req.body;
    const subscription = new NewsletterSubscribe({ email });
    await subscription.save();
    res.status(201).json(subscription);
  } catch (err) {
    next(err);
  }
});

// Lister les abonnés (optionnel)
router.get('/', async (req, res) => {
  try {
    const subscribers = await NewsletterSubscribe.find();
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;