const { Router } = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/users
router.get('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, nombre, apellidos, telefono, rol, created_at FROM profiles ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/users
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { email, password, nombre, apellidos, telefono, rol } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, contraseña y nombre requeridos' });
    }
    if (!['direccion', 'administracion', 'limpieza'].includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const [existing] = await pool.query('SELECT id FROM profiles WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO profiles (email, password_hash, nombre, apellidos, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hash, nombre, apellidos || '', telefono || '', rol]
    );

    res.status(201).json({ id: result.insertId, email, nombre, rol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre, apellidos, telefono, rol, password } = req.body;

    // Prevent changing own role (can't lock yourself out)
    if (parseInt(req.params.id) === req.user.id && rol && rol !== req.user.rol) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }

    const fields = [];
    const params = [];

    if (nombre) { fields.push('nombre = ?'); params.push(nombre); }
    if (apellidos !== undefined) { fields.push('apellidos = ?'); params.push(apellidos); }
    if (telefono !== undefined) { fields.push('telefono = ?'); params.push(telefono); }
    if (rol) { fields.push('rol = ?'); params.push(rol); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      params.push(hash);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

    params.push(req.params.id);
    await pool.query(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireRole('direccion'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    await pool.query('DELETE FROM profiles WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
