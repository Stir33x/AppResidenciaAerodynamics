const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, apellidos, rol } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM profiles WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO profiles (email, password_hash, nombre, apellidos, rol) VALUES (?, ?, ?, ?, ?)',
      [email, hash, nombre, apellidos || '', rol || 'estudiante']
    );

    const token = jwt.sign(
      { id: result.insertId, email, rol: rol || 'estudiante' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.insertId, email, nombre, rol: rol || 'estudiante' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const [rows] = await pool.query(`
      SELECT p.*, s.habitacion
      FROM profiles p
      LEFT JOIN students s ON s.profile_id = p.id
      WHERE p.email = ?
    `, [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id, email: user.email, nombre: user.nombre,
        apellidos: user.apellidos, telefono: user.telefono, rol: user.rol,
        habitacion: user.habitacion || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, s.habitacion
      FROM profiles p
      LEFT JOIN students s ON s.profile_id = p.id
      WHERE p.id = ?
    `, [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = rows[0];
    res.json({
      id: u.id, email: u.email, nombre: u.nombre,
      apellidos: u.apellidos, telefono: u.telefono, rol: u.rol,
      habitacion: u.habitacion || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
