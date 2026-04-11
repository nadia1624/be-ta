const express = require('express');
const router = express.Router();
const googleAuthController = require('../controllers/googleAuthController');

// Initiate OAuth - this is the URL in the email
router.get('/initiate/:id_pimpinan', googleAuthController.initiateAuth);

// Google Callback
router.get('/callback', googleAuthController.handleCallback);

// Helper to get raw URL (for admin dashboard maybe)
router.get('/url/:id_pimpinan', googleAuthController.getAuthUrl);

module.exports = router;
