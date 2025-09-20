import express from 'express';
import Student from '../../models/students';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { email, name, prenom } = req.body;
    const existingStudent = await Student.findOne({ email, name, prenom });
    if (existingStudent) {
      return res.status(409).json({ error: "Cet étudiant existe déjà." });
    }
    const studentData = {
      name: req.body.name,
      prenom: req.body.prenom,
      email: req.body.email,
      niveauEtude: req.body.niveauEtude,
      dateNaissance: req.body.dateNaissance,
      ville: req.body.ville,
      numeroWhatsapp: req.body.numeroWhatsapp,
      dateInscription: new Date()
    };
    const student = new Student(studentData);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(
      students.map(student => ({
        ...student.toObject(),
        dateInscription: student.dateInscription 
      }))
    );
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({
      ...student.toObject(),
      dateInscription: student.dateInscription 
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;