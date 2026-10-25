const crypto = require('node:crypto');

/** Redirects to the login page unless someone is logged in. */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error_msg', 'Please log in to view that page');
  return res.redirect('/users/login');
}

/**
 * Per-session CSRF token. Every form includes it as a hidden `_csrf` field and
 * every POST must send it back.
 */
function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (req.method !== 'POST') return next();

  const expected = Buffer.from(req.session.csrfToken);
  const sent = Buffer.from(String(req.body?._csrf || ''));
  if (sent.length === expected.length && crypto.timingSafeEqual(sent, expected)) return next();
  return res.status(403).render('error', { message: 'Your form expired. Please go back, reload the page and try again.' });
}

/**
 * One-time messages stored in the session (what connect-flash used to do).
 * req.flash(type, msg) adds a message; req.flash(type) reads and clears them.
 * Passport's failureFlash uses the same API.
 */
function flash(req, res, next) {
  req.flash = (type, msg) => {
    const all = req.session.flash || (req.session.flash = {});
    if (msg === undefined) {
      const messages = all[type] || [];
      delete all[type];
      return messages;
    }
    (all[type] || (all[type] = [])).push(msg);
    return all[type].length;
  };
  next();
}

module.exports = { ensureAuthenticated, csrf, flash };
