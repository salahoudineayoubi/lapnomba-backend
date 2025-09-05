import { Router } from 'express';
import { Projet } from '../models/projet';
const router = Router();
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const projet = await Projet.create({ name, email, message });
    res.status(201).json(projet);
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});
router.get('/', async (req, res) => {
  try {
    const projets = await Projet.findAll({ order: [['createdAt', 'DESC']] });
    res.json(projets);
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});
export default router;