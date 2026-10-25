const express = require('express');
const { ensureAuthenticated } = require('../middleware');

const router = express.Router();

// Dashboard
router.get('/', ensureAuthenticated, (req, res) => res.render('index'));

module.exports = router;
