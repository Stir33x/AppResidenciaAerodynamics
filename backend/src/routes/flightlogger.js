// ============================================================
// FLIGHTLOGGER — Búsqueda de usuarios en FlightLogger (proxy)
// ============================================================
// El frontend SOLO hace una petición cuando el usuario escribe las
// 3 letras (por el límite de peticiones de FlightLogger). Este
// endpoint actúa de proxy: la API key vive en el .env del backend.
//
//   GET /api/flightlogger/search?q=abc&campo=nombre|email
// ============================================================
const { Router } = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { searchUsers } = require('../lib/flightlogger');

const router = Router();

router.use(authMiddleware);

router.get('/search', requireRole('direccion', 'administracion'), async (req, res) => {
  const q = (req.query.q || '').trim();
  const campo = req.query.campo === 'email' ? 'email' : 'nombre';

  if (!q || q.length !== 3) {
    return res.status(400).json({ error: 'La búsqueda requiere exactamente 3 caracteres' });
  }

  try {
    const users = await searchUsers(q, campo);
    res.json(users);
  } catch (err) {
    const configMsg = 'FlightLogger no está configurado: añade FLIGHTLOGGER_API_URL y FLIGHTLOGGER_API_KEY al .env';
    const msg = err.message && err.message.includes('no está configurado') ? configMsg : `Error consultando FlightLogger: ${err.message}`;
    console.error(`FlightLogger search error: ${err.message}`);
    res.status(502).json({ error: msg });
  }
});

module.exports = router;