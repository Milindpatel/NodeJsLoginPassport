const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

// Same message for an unknown user and a wrong password, so usernames can't be probed.
const LOGIN_FAILED = 'Invalid username or password';

module.exports = function configurePassport(passport) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username: String(username).trim() });
        if (!user || !(await user.comparePassword(password))) {
          return done(null, false, { message: LOGIN_FAILED });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      // false (not an error) when the user was deleted: they are simply logged out.
      done(null, (await User.findById(id)) || false);
    } catch (err) {
      done(err);
    }
  });
};
