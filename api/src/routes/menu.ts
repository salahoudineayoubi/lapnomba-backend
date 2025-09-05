import { Router } from 'express';
import { Menu } from '../models/menu';

const router = Router();

// Get all menus
router.get('/', async (req, res) => {
  try {
    const menus = await Menu.findAll({ include: [{ model: Menu, as: 'children' }] });
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menus.' });
  }
});

// Create a menu
router.post('/', async (req, res) => {
  try {
    const { titre, slug, ordre, parentId, isActive } = req.body;
    const menu = await Menu.create({ titre, slug, ordre, parentId, isActive });
    res.status(201).json(menu);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create menu.' });
  }
});

// Update a menu
router.put('/:id', async (req, res) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return res.status(404).json({ error: 'Menu not found.' });
    await menu.update(req.body);
    res.json(menu);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update menu.' });
  }
});

// Delete a menu
router.delete('/:id', async (req, res) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    if (!menu) return res.status(404).json({ error: 'Menu not found.' });
    await menu.destroy();
    res.json({ message: 'Menu deleted.' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete menu.' });
  }
});

export default router;