import express from 'express';
import { AppDataSource } from '../../data-source';
import { Student } from '../../models/students';

const router = express.Router();
const studentRepo = AppDataSource.getRepository(Student);

router.post('/', async (req, res) => {
  try {
    const { email, name, prenom } = req.body;
    const existingStudent = await studentRepo.findOne({ where: { email, name, prenom } });
    if (existingStudent) {
      return res.status(409).json({ error: "Cet étudiant existe déjà." });
    }
    const student = studentRepo.create({
      name: req.body.name,
      prenom: req.body.prenom,
      email: req.body.email,
      niveauEtude: req.body.niveauEtude,
      dateNaissance: req.body.dateNaissance,
      ville: req.body.ville,
      numeroWhatsapp: req.body.numeroWhatsapp,
      dateInscription: new Date()
    });
    await studentRepo.save(student);
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get('/', async (req, res) => {
  try {
    const students = await studentRepo.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const student = await studentRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const student = await studentRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    studentRepo.merge(student, req.body);
    await studentRepo.save(student);
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await studentRepo.delete(Number(req.params.id));
    if (result.affected === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;