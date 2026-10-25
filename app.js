const path = require('node:path');
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const passport = require('passport');
const configurePassport = require('./config/passport');
const { csrf, flash } = require('./middleware');

/**
 * @param {object} config  { sessionSecret, isProduction }
 * @param {object} [options]  { sessionStore } -- defaults to the in-memory store (tests, quick local runs)
 */
function createApp(config, { sessionStore } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1);

  app.engine('handlebars', engine({ defaultLayout: 'layout' }));
  app.set('view engine', 'handlebars');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  app.use(
    session({
      name: 'loginapp.sid',
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: Boolean(config.isProduction),
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );

  configurePassport(passport);
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash);
  app.use(csrf);

  // Available in every view.
  app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user ? { name: req.user.name, username: req.user.username } : null;
    next();
  });

  app.use('/', require('./routes/index'));
  app.use('/users', require('./routes/users'));

  app.use((req, res) => res.status(404).render('error', { message: 'Page not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { message: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
