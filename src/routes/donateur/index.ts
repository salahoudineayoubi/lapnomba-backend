import express from 'express';
import Donateur from '../../models/donor';

const router = express.Router();


router.post('/', async (req, res, next) => {
  try {
    const { nom, email, montant, typePaiement } = req.body;
    const donateur = new Donateur({ nom, email, montant, typePaiement });
    await donateur.save();
    res.status(201).json(donateur);
  } catch (err) {
    next(err);
  }
});


router.get('/', async (req, res) => {
  try {
    const donateurs = await Donateur.find();
    res.json(donateurs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});



router.get('/stats', async (req, res) => {
  try {
    const result = await Donateur.aggregate([
      { $group: { _id: null, totalMontant: { $sum: "$montant" }, count: { $sum: 1 } } }
    ]);
    res.json({
      totalMontant: result[0]?.totalMontant || 0,
      nombreDonateurs: result[0]?.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


export default router;