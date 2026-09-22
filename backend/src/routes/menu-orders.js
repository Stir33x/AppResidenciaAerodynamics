const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

const ESTADOS = ['pendiente', 'servido', 'cancelado'];

function hoy() {
  return new Date().toISOString().split('T')[0];
}

function parseCantidad(v) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(99, Math.max(1, n));
}

const ORDER_SELECT = `SELECT o.id, o.menu_item_id, o.cantidad, o.estado, o.nota, o.fecha, o.created_at,
        mi.nombre AS item_nombre,
        sec.nombre AS seccion,
        tpl.nombre AS template_nombre,
        p.id AS profile_id, p.nombre, p.apellidos, p.rol,
        COALESCE(s.habitacion, g.habitacion) AS habitacion
 FROM menu_orders o
 JOIN menu_template_items mi ON mi.id = o.menu_item_id
 JOIN menu_template_sections sec ON sec.id = mi.section_id
 JOIN menu_templates tpl ON tpl.id = sec.template_id
 JOIN profiles p ON p.id = o.profile_id
 LEFT JOIN students s ON s.profile_id = p.id
 LEFT JOIN guests g ON g.profile_id = p.id`;

// GET /api/menu-orders?fecha=YYYY-MM-DD  (cocina y direccion: ven todas las reservas)
router.get('/', requireRole('cocina', 'direccion'), async (req, res) => {
  try {
    const fecha = req.query.fecha || hoy();
    const [rows] = await pool.query(
      `${ORDER_SELECT} WHERE o.fecha = ? AND o.estado <> 'cancelado'
       ORDER BY sec.orden, mi.orden, o.created_at`,
      [fecha]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/menu-orders/mine?fecha=YYYY-MM-DD  (estudiante e invitado: sus propias reservas)
router.get('/mine', requireRole('estudiante', 'invitado'), async (req, res) => {
  try {
    const fecha = req.query.fecha || hoy();
    const [rows] = await pool.query(
      `${ORDER_SELECT} WHERE o.profile_id = ? AND o.fecha = ? AND o.estado <> 'cancelado'
       ORDER BY sec.orden, mi.orden, o.created_at`,
      [req.user.id, fecha]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/menu-orders  (estudiante e invitado: reserva platos del menú)
router.post('/', requireRole('estudiante', 'invitado'), async (req, res) => {
  try {
    const { item_id, fecha, cantidad, nota } = req.body;
    if (!item_id) {
      return res.status(400).json({ error: 'Falta el plato' });
    }
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Fecha no válida' });
    }

    const [items] = await pool.query('SELECT id FROM menu_template_items WHERE id = ?', [item_id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'El plato no existe' });
    }

    const dia = fecha || hoy();
    const cant = parseCantidad(cantidad);
    const note = (nota || '').slice(0, 255);

    const [existing] = await pool.query(
      `SELECT id, cantidad FROM menu_orders
       WHERE menu_item_id = ? AND profile_id = ? AND fecha = ? AND estado = 'pendiente'`,
      [item_id, req.user.id, dia]
    );

    let id;
    if (existing.length > 0) {
      id = existing[0].id;
      await pool.query(
        'UPDATE menu_orders SET cantidad = ?, nota = ? WHERE id = ?',
        [Math.min(99, existing[0].cantidad + cant), note, id]
      );
    } else {
      const [result] = await pool.query(
        `INSERT INTO menu_orders (menu_item_id, profile_id, fecha, cantidad, estado, nota)
         VALUES (?, ?, ?, ?, 'pendiente', ?)`,
        [item_id, req.user.id, dia, cant, note]
      );
      id = result.insertId;
    }

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/menu-orders/:id  (estado: SÓLO cocina; cantidad: cocina o dueño estudiante)
router.put('/:id', async (req, res) => {
  try {
    const { cantidad, estado } = req.body;
    const [rows] = await pool.query('SELECT * FROM menu_orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const order = rows[0];

    const isCocina = req.user.rol === 'cocina';
    const owner = order.profile_id === req.user.id;
    if (!isCocina && !owner) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    if (estado !== undefined) {
      if (!isCocina) {
        return res.status(403).json({ error: 'Acceso no autorizado' });
      }
      if (!ESTADOS.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
      }
      if (estado === 'cancelado' && order.estado !== 'pendiente') {
        return res.status(400).json({ error: 'Solo se puede anular un pedido pendiente' });
      }
      await pool.query('UPDATE menu_orders SET estado = ? WHERE id = ?', [estado, req.params.id]);
    } else if (cantidad !== undefined) {
      await pool.query('UPDATE menu_orders SET cantidad = ? WHERE id = ?', [parseCantidad(cantidad), req.params.id]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/menu-orders/:id  (anular: dueño estudiante o cocina; solo pendiente)
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const order = rows[0];

    const isCocina = req.user.rol === 'cocina';
    const owner = order.profile_id === req.user.id;
    if (!isCocina && !owner) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    if (order.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se puede anular un pedido pendiente' });
    }

    await pool.query("UPDATE menu_orders SET estado = 'cancelado' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;