import express from 'express';
import JoinTeamRequest from '../../models/join_team_request';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { nomComplet, email, numeroWhatsapp, message, profession } = req.body; // Ajoute profession
    const joinRequest = new JoinTeamRequest({ nomComplet, email, numeroWhatsapp, message, profession }); // Ajoute profession
    await joinRequest.save();
    res.status(201).json(joinRequest);
  } catch (err) {
    next(err); 
  }
});

router.get('/', async (req, res) => {
  try {
    const requests = await JoinTeamRequest.find();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;