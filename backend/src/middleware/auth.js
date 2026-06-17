const passport = require('passport');

const authMiddleware = passport.authenticate('jwt', { session: false });

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
