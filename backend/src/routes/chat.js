const { Router } = require('express');
const { EventEmitter } = require('events');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// Roles con acceso al chat
const CHAT_ROLES = ['estudiante', 'invitado', 'staff', 'cocina', 'limpieza', 'direccion', 'administracion'];
// Roles con la vista general (conversaciones + contactos): todos salvo estudiantes
const GENERAL_ROLES = ['invitado', 'staff', 'cocina', 'limpieza', 'direccion', 'administracion'];
// Únicamente dirección/administración pueden chatear directamente con un alumno
// (a través de la conversación de equipo, que es la única vista por el estudiante).
const TEAM_ROLES = ['direccion', 'administracion'];

const LONG_POLL_TIMEOUT_MS = 25000;

// Bus global en memoria: cualquier cambio (mensaje nuevo o marcado de leído)
// despierta las peticiones long-poll y estas comprueban si tienen datos nuevos.
const chatBus = new EventEmitter();
chatBus.setMaxListeners(0);

const MSG_SELECT = `SELECT m.id, m.conversation_id, m.sender_id, m.sender_rol, m.mensaje, m.leido, m.created_at,
        p.nombre, p.apellidos
 FROM chat_messages m
 JOIN profiles p ON p.id = m.sender_id`;

// Un estudiante tiene una conversación de 'equipo' con todo el personal
// de dirección/administración (get-or-create).
async function getOrCreateTeamConversation(studentId) {
  const [rows] = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     WHERE c.tipo = 'equipo' AND cp.profile_id = ?
     LIMIT 1`,
    [studentId]
  );
  if (rows.length) return rows[0].id;

  const [team] = await pool.query(
    `SELECT id FROM profiles WHERE rol IN ('direccion','administracion')`
  );
  const [r] = await pool.query(`INSERT INTO conversations (tipo) VALUES ('equipo')`);
  const participants = team.map((p) => [r.insertId, p.id]);
  participants.push([r.insertId, studentId]);
  await pool.query(
    `INSERT INTO conversation_participants (conversation_id, profile_id) VALUES ?`,
    [participants]
  );
  return r.insertId;
}

// Conversación privada 1:1 entre dos perfiles (get-or-create).
async function getOrCreatePrivateConversation(a, b) {
  const [rows] = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants pa ON pa.conversation_id = c.id AND pa.profile_id = ?
     JOIN conversation_participants pb ON pb.conversation_id = c.id AND pb.profile_id = ?
     WHERE c.tipo = 'privado'
     LIMIT 1`,
    [a, b]
  );
  if (rows.length) return rows[0].id;

  const [r] = await pool.query(`INSERT INTO conversations (tipo) VALUES ('privado')`);
  await pool.query(
    `INSERT INTO conversation_participants (conversation_id, profile_id) VALUES (?, ?), (?, ?)`,
    [r.insertId, a, r.insertId, b]
  );
  return r.insertId;
}

// Helper long-poll:
//  - lanza la consulta; si `empty === false` (hay datos nuevos) responde al momento;
//  - si no, mantiene la conexión abierta y responde cuando el bus emita 'chat'
//    (o al vencer LONG_POLL_TIMEOUT_MS para que el cliente vuelva a preguntar).
// El cliente controla qué es "nuevo" con tokens (after/since), evitando bucles.
function longPollHandler({ query }) {
  return async (req, res) => {
    let settled = false;

    const finish = async (pre) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chatBus.off('chat', onEvent);
      try {
        res.json(pre !== undefined ? pre : await query(req));
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
      }
    };

    const timer = setTimeout(() => { finish(); }, LONG_POLL_TIMEOUT_MS);
    const onEvent = () => { finish(); };

    chatBus.on('chat', onEvent);
    req.on('close', () => {
      if (req.aborted && !settled) {
        settled = true;
        clearTimeout(timer);
        chatBus.off('chat', onEvent);
      }
    });

    try {
      const payload = await query(req);
      if (!settled && !payload.empty) finish(payload);
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        chatBus.off('chat', onEvent);
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
      }
    }
  };
}

// GET /api/chat/unread?since=ID  (NO LEÍDAS globales → badge de la barra lateral)
router.get('/unread', requireRole(...CHAT_ROLES), longPollHandler({
  query: async (req) => {
    const since = parseInt(req.query.since, 10) || 0;
    const [agg] = await pool.query(
      `SELECT COUNT(*) AS n
       FROM chat_messages m
       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
       WHERE cp.profile_id = ? AND m.sender_id <> ? AND m.leido = 0`,
      [req.user.id, req.user.id]
    );
    const [mx] = await pool.query(
      `SELECT COALESCE(MAX(m.id), 0) AS max_id
       FROM chat_messages m
       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
       WHERE cp.profile_id = ?`,
      [req.user.id]
    );
    const max_id = mx[0].max_id;
    return { no_leidas: agg[0].n, max_id, empty: max_id <= since };
  },
}));

// GET /api/chat/mine?after=ID  (SÓLO estudiante: su hilo con el equipo de dirección)
router.get('/mine', requireRole('estudiante'), longPollHandler({
query: async (req) => {
      const conversation_id = await getOrCreateTeamConversation(req.user.id);
      const after = parseInt(req.query.after, 10) || 0;
      const [rows] = await pool.query(
        `${MSG_SELECT} WHERE m.conversation_id = ? AND m.id > ? ORDER BY m.id ASC`,
        [conversation_id, after]
      );
      const [upd] = await pool.query(
        `UPDATE chat_messages SET leido = 1
         WHERE conversation_id = ? AND sender_id <> ? AND leido = 0`,
        [conversation_id, req.user.id]
      );
      // Solo emitir si realmente se marcó algo como leído; si no, respondería
      // y despertaría otras long-polls en cascada (bucle infinito).
      if (upd.changedRows > 0) chatBus.emit('chat');
      return { conversation_id, messages: rows, empty: rows.length === 0 };
    },
}));

// GET /api/chat/conversations?since=ID  (lista de conversaciones del usuario)
router.get('/conversations', requireRole(...GENERAL_ROLES), longPollHandler({
  query: async (req) => {
    const since = parseInt(req.query.since, 10) || 0;
    const [convs] = await pool.query(
      `SELECT c.id, c.tipo,
              (SELECT m.mensaje FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS ultimo,
              (SELECT m.created_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS ultimo_at,
              (SELECT COUNT(*) FROM chat_messages m
               WHERE m.conversation_id = c.id AND m.leido = 0 AND m.sender_id <> ?) AS no_leidas
       FROM conversations c
       JOIN conversation_participants me ON me.conversation_id = c.id AND me.profile_id = ?
       WHERE EXISTS (SELECT 1 FROM chat_messages m WHERE m.conversation_id = c.id)
       ORDER BY ultimo_at DESC`,
      [req.user.id, req.user.id]
    );
    const ids = convs.map((c) => c.id);
    let parts = [];
    if (ids.length) {
      const [rows] = await pool.query(
        `SELECT cp.conversation_id, p.id AS profile_id, p.nombre, p.apellidos, p.rol,
                COALESCE((SELECT s.habitacion FROM students s WHERE s.profile_id = p.id),
                         (SELECT g.habitacion FROM guests g WHERE g.profile_id = p.id)) AS habitacion
         FROM conversation_participants cp
         JOIN profiles p ON p.id = cp.profile_id
         WHERE cp.conversation_id IN (?)`,
        [ids]
      );
      parts = rows;
    }
    const [mx] = await pool.query(
      `SELECT COALESCE(MAX(m.id), 0) AS max_id
       FROM chat_messages m
       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
       WHERE cp.profile_id = ?`,
      [req.user.id]
    );
    const max_id = mx[0].max_id;

    const items = convs.map((c) => {
      const otros = parts.filter((p) => p.conversation_id === c.id && p.profile_id !== req.user.id);
      const otro = c.tipo === 'equipo' ? (otros.find((p) => p.rol === 'estudiante') || otros[0]) : otros[0];
      return {
        id: c.id,
        tipo: c.tipo,
        ultimo: c.ultimo,
        ultimo_at: c.ultimo_at,
        no_leidas: Number(c.no_leidas),
        otro: otro
          ? { id: otro.profile_id, nombre: otro.nombre, apellidos: otro.apellidos, rol: otro.rol, habitacion: otro.habitacion }
          : null,
      };
    });

    return { conversations: items, max_id, empty: items.length === 0 || max_id <= since };
  },
}));

// GET /api/chat/messages?conversation_id=X&after=ID  (mensajes de una conversación)
router.get('/messages', requireRole(...GENERAL_ROLES), async (req, res) => {
  const conversation_id = parseInt(req.query.conversation_id, 10);
  if (!Number.isInteger(conversation_id)) return res.status(400).json({ error: 'Falta la conversación' });
  const [part] = await pool.query(
    `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND profile_id = ?`,
    [conversation_id, req.user.id]
  );
  if (!part.length) return res.status(403).json({ error: 'No participas en esta conversación' });

  return longPollHandler({
    query: async () => {
      const after = parseInt(req.query.after, 10) || 0;
      const [rows] = await pool.query(
        `${MSG_SELECT} WHERE m.conversation_id = ? AND m.id > ? ORDER BY m.id ASC`,
        [conversation_id, after]
      );
      const [upd] = await pool.query(
        `UPDATE chat_messages SET leido = 1
         WHERE conversation_id = ? AND sender_id <> ? AND leido = 0`,
        [conversation_id, req.user.id]
      );
      // Solo emitir si realmente se marcó algo como leído (evita bucles en cascada).
      if (upd.changedRows > 0) chatBus.emit('chat');
      return { messages: rows, empty: rows.length === 0 };
    },
  })(req, res);
});

// GET /api/chat/people  (directorio de personas para iniciar un chat 1:1)
router.get('/people', requireRole(...GENERAL_ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.nombre, p.apellidos, p.rol,
              COALESCE((SELECT s.habitacion FROM students s WHERE s.profile_id = p.id),
                       (SELECT g.habitacion FROM guests g WHERE g.profile_id = p.id)) AS habitacion
       FROM profiles p
       WHERE p.id <> ?
       ORDER BY FIELD(p.rol, 'direccion','administracion','cocina','staff','limpieza','estudiante','invitado'),
                p.apellidos, p.nombre`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/chat/start { user_id }  (abre o reutiliza la conversación 1:1)
router.post('/start', requireRole(...GENERAL_ROLES), async (req, res) => {
  try {
    const target = parseInt(req.body.user_id, 10);
    if (!Number.isInteger(target)) return res.status(400).json({ error: 'Falta el usuario' });
    if (target === req.user.id) return res.status(400).json({ error: 'No puedes chatear contigo mismo' });
    const [prof] = await pool.query(`SELECT id, rol FROM profiles WHERE id = ?`, [target]);
    if (!prof.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Si el destinatario es un alumno, se usa su conversación de equipo
    // (el alumno solo ve el equipo de dirección/administración).
    let conversation_id;
    if (prof[0].rol === 'estudiante') {
      if (!TEAM_ROLES.includes(req.user.rol)) {
        return res.status(403).json({ error: 'Los alumnos solo chatean con dirección y administración' });
      }
      conversation_id = await getOrCreateTeamConversation(target);
    } else {
      conversation_id = await getOrCreatePrivateConversation(req.user.id, target);
    }
    chatBus.emit('chat');
    res.json({ conversation_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/chat
//  - estudiante: envía a su hilo con el equipo de dirección
//  - resto: a una conversación en la que participe (conversation_id)
//    o iniciando una 1:1 con un usuario (user_id)
router.post('/', async (req, res) => {
  try {
    const text = String(req.body.mensaje || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: 'Escribe un mensaje' });

    let conversation_id;
    if (req.user.rol === 'estudiante') {
      conversation_id = await getOrCreateTeamConversation(req.user.id);
    } else if (GENERAL_ROLES.includes(req.user.rol)) {
      if (req.body.conversation_id) {
        conversation_id = parseInt(req.body.conversation_id, 10);
        if (!Number.isInteger(conversation_id)) return res.status(400).json({ error: 'Conversación inválida' });
        const [part] = await pool.query(
          `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND profile_id = ?`,
          [conversation_id, req.user.id]
        );
        if (!part.length) return res.status(403).json({ error: 'No participas en esta conversación' });
      } else if (req.body.user_id) {
        const target = parseInt(req.body.user_id, 10);
        const [prof] = await pool.query(`SELECT id, rol FROM profiles WHERE id = ?`, [target]);
        if (!prof.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (prof[0].rol === 'estudiante') {
          if (!TEAM_ROLES.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Los alumnos solo chatean con dirección y administración' });
          }
          conversation_id = await getOrCreateTeamConversation(target);
        } else {
          conversation_id = await getOrCreatePrivateConversation(req.user.id, target);
        }
      } else {
        return res.status(400).json({ error: 'Falta el destinatario' });
      }
    } else {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const [r] = await pool.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, sender_rol, mensaje) VALUES (?, ?, ?, ?)`,
      [conversation_id, req.user.id, req.user.rol, text]
    );
    chatBus.emit('chat');
    res.status(201).json({ id: r.insertId, conversation_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;