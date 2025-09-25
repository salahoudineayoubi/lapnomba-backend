import express from 'express';
import { AppDataSource } from '../../data-source';
import { ProjectSummit } from '../../models/project_summit';

const router = express.Router();
const projectRepo = AppDataSource.getRepository(ProjectSummit);

router.post('/', async (req, res) => {
  try {
    console.log("Données reçues dans l'API project-summit:", req.body);
    
    const { nomComplet, email, nomProjet, description, numeroWhatsapp } = req.body;
    
    // Validation des champs requis
    if (!nomComplet || !email || !nomProjet || !description || !numeroWhatsapp) {
      return res.status(400).json({ 
        error: "Tous les champs sont requis",
        received: req.body 
      });
    }
    
    const project = projectRepo.create({ 
      nomComplet, 
      email, 
      nomProjet, 
      description, 
      numeroWhatsapp 
    });
    
    console.log("Projet créé avant sauvegarde:", project);
    
    const savedProject = await projectRepo.save(project);
    
    console.log("Projet sauvegardé:", savedProject);
    
    res.status(201).json(savedProject);
  } catch (err) {
    console.error("Erreur dans /api/project-summit:", err);
    res.status(500).json({ 
      error: "Erreur serveur", 
      details: (err as Error).message 
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const projects = await projectRepo.find();
    res.json(projects);
  } catch (err) {
    console.error("Erreur GET /api/project-summit:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;