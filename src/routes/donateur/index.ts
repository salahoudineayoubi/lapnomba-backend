import express from 'express';
import { AppDataSource } from '../../data-source';
import { Donateur } from '../../models/donor';

const router = express.Router();
const donateurRepo = AppDataSource.getRepository(Donateur);

router.post('/', async (req, res, next) => {
  try {
    const { nom, email, montant, typePaiement } = req.body;
    const donateur = donateurRepo.create({ nom, email, montant, typePaiement });
    await donateurRepo.save(donateur);
    res.status(201).json(donateur);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res) => {
  try {
    const donateurs = await donateurRepo.find();
    res.json(donateurs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [result] = await donateurRepo
      .createQueryBuilder("donateur")
      .select("SUM(donateur.montant)", "totalMontant")
      .addSelect("COUNT(donateur.id)", "nombreDonateurs")
      .getRawMany();

    res.json({
      totalMontant: Number(result?.totalMontant) || 0,
      nombreDonateurs: Number(result?.nombreDonateurs) || 0
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;