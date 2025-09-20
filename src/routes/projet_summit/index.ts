import express from 'express';
import ProjectSummit from '../../models/project_summit';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { nomComplet, email, nomProjet, description, numeroWhatsapp } = req.body;
    const project = new ProjectSummit({ nomComplet, email, nomProjet, description, numeroWhatsapp });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res) => {
  try {
    const projects = await ProjectSummit.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;