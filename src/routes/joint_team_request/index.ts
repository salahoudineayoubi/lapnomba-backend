import express from 'express';
import { AppDataSource } from '../../data-source';
import { JoinTeamRequest } from '../../models/join_team_request';

const router = express.Router();
const joinTeamRequestRepo = AppDataSource.getRepository(JoinTeamRequest);

router.post('/', async (req, res, next) => {
  try {
    const { nomComplet, email, numeroWhatsapp, message, profession } = req.body;
    const joinRequest = joinTeamRequestRepo.create({ nomComplet, email, numeroWhatsapp, message, profession });
    await joinTeamRequestRepo.save(joinRequest);
    res.status(201).json(joinRequest);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res) => {
  try {
    const requests = await joinTeamRequestRepo.find();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;