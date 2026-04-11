const BaseController = require('./BaseController');
const { Pimpinan } = require('../models');
const googleCalendarHelper = require('../helpers/googleCalendarHelper');
require('dotenv').config();

class GoogleAuthController extends BaseController {
    /**
     * Redirect to Google OAuth
     */
    async initiateAuth(req, res) {
        try {
            const { id_pimpinan } = req.params;
            const pimpinan = await Pimpinan.findByPk(id_pimpinan);
            
            if (!pimpinan) {
                return this.sendResponse(res, 404, false, 'Pimpinan tidak ditemukan');
            }

            const authUrl = googleCalendarHelper.getAuthUrl(id_pimpinan);
            // In a real API, we might return the URL or redirect
            // Since this is called from an email link mostly, we redirect
            return res.redirect(authUrl);
        } catch (error) {
            return this.sendError(res, error, 'Gagal inisialisasi Google Auth');
        }
    }

    /**
     * Handle Callback from Google
     */
    async handleCallback(req, res) {
        try {
            const { code, state: id_pimpinan } = req.query;
            
            if (!code) {
                return res.status(400).send('Authorization code missing');
            }

            const tokens = await googleCalendarHelper.getTokens(code);
            
            const pimpinan = await Pimpinan.findByPk(id_pimpinan);
            if (!pimpinan) {
                return res.status(404).send('Pimpinan not found');
            }

            // Update Pimpinan with tokens
            await pimpinan.update({
                google_access_token: tokens.access_token,
                google_refresh_token: tokens.refresh_token || pimpinan.google_refresh_token, // Refresh token only sent on first prompt
                google_token_expiry: tokens.expiry_date,
                is_calendar_synced: true
            });

            // Redirect back to frontend success page
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/google-auth-success?nama=${encodeURIComponent(pimpinan.nama_pimpinan)}`);
        } catch (error) {
            console.error('Google Auth Callback Error:', error);
            return res.status(500).send('Gagal memproses sinkronisasi Google Calendar');
        }
    }
    
    /**
     * Public route to get direct link (for testing or manual sync)
     */
    async getAuthUrl(req, res) {
        try {
            const { id_pimpinan } = req.params;
            const authUrl = googleCalendarHelper.getAuthUrl(id_pimpinan);
            return this.sendResponse(res, 200, true, 'Original Auth URL', { authUrl });
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil URL');
        }
    }
}

module.exports = new GoogleAuthController();
