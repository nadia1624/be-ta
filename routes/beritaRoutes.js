const express = require('express');
const router = express.Router();
const beritaController = require('../controllers/beritaController');

router.get('/public', beritaController.getPublicBerita);

module.exports = router;
