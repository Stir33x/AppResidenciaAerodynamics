const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const pool = require('./db');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (payload, done) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, email, nombre, apellidos, telefono, rol FROM profiles WHERE id = ?',
        [payload.id]
      );
      if (rows.length === 0) return done(null, false);
      return done(null, rows[0]);
    } catch (err) {
      return done(err, false);
    }
  })
);

module.exports = passport;
