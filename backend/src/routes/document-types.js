const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

// GET /api/document-types
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM document_types ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/document-types
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre, color } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query(
      'INSERT INTO document_types (nombre, color) VALUES (?, ?)',
      [nombre.trim(), color || 'badge-soft']
    );
    res.status(201).json({ id: result.insertId, nombre: nombre.trim(), color: color || 'badge-soft' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ese tipo ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/document-types/:id
router.put('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre, color } = req.body;
    await pool.query(
      'UPDATE document_types SET nombre = COALESCE(?, nombre), color = COALESCE(?, color) WHERE id = ?',
      [nombre, color, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ese tipo ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/document-types/:id
router.delete('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM document_types WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
