import { Router } from 'express';
import { User } from '../models/user';
import bcrypt from 'bcrypt';

const router = Router();

// GET tous les utilisateurs
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// POST créer un utilisateur
router.post('/', async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      password,
      role,
      telephone,
      ville,
      niveauEtude,
      dateNaissance
    } = req.body;

    // Génère un mot de passe aléatoire si non fourni
    const plainPassword = password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({
      nom,
      prenom,
      email,
      password: hashedPassword,
      role,
      telephone,
      ville,
      niveauEtude,
      dateNaissance
    });
    res.status(201).json(user);
  } catch (err) {
    console.error(err); 
    res.status(400).json({ error: 'Erreur lors de la création de l’utilisateur' });
  }
});

// PUT modifier un utilisateur
router.put('/:id', async (req, res) => {
  try {
    const { nom, prenom, email, password, role, telephone, ville, niveauEtude } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    let updatedFields: any = { nom, prenom, email, role, telephone, ville, niveauEtude };
    if (password) {
      updatedFields.password = await bcrypt.hash(password, 10);
    }
    await user.update(updatedFields);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: 'Erreur lors de la modification de l’utilisateur' });
  }
});

// DELETE supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    await user.destroy();
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(400).json({ error: 'Erreur lors de la suppression de l’utilisateur' });
  }
});

export default router;