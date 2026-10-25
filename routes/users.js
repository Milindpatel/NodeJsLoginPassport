const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');

const router = express.Router();

router.get('/register', (req, res) => res.render('register'));
router.get('/login', (req, res) => res.render('login'));

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().notEmpty().withMessage('Email is required').bail().isEmail().withMessage('Email is not valid'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('password2')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

router.post('/register', registerRules, async (req, res) => {
  const { name, email, username, password } = req.body;
  // Values to put back in the form if something is wrong (never the passwords).
  const form = { name, email, username };

  const errors = validationResult(req).array({ onlyFirstError: true });
  if (!errors.length && (await User.exists({ username }))) {
    errors.push({ msg: 'That username is already taken' });
  }
  if (errors.length) {
    return res.status(400).render('register', { errors, form });
  }

  try {
    await User.create({ name, email, username, password });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).render('register', { errors: [{ msg: 'That username is already taken' }], form });
    }
    throw err;
  }

  req.flash('success_msg', 'You are registered and can now log in');
  return res.redirect('/users/login');
});

router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/users/login',
    failureFlash: true,
  }),
);

// POST (not GET) so another site can't log people out with a link or image.
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success_msg', 'You are logged out');
    return res.redirect('/users/login');
  });
});

module.exports = router;
