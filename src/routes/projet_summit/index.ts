import express from 'express';
import { AppDataSource } from '../../data-source';
import { ProjectSummit } from '../../models/project_summit';

const router = express.Router();
const projectRepo = AppDataSource.getRepository(ProjectSummit);

router.post('/', async (req, res, next) => {
  try {
    const { nomComplet, email, nomProjet, description, numeroWhatsapp } = req.body;
    const project = projectRepo.create({ nomComplet, email, nomProjet, description, numeroWhatsapp });
    await projectRepo.save(project);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res) => {
  try {
    const projects = await projectRepo.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;