const { google } = require('googleapis');
require('dotenv').config();

class GoogleCalendarHelper {
    constructor(oauth2Client = null) {
        // Delaying initialization if no client provided to ensure factory is available
        this._oauth2Client = oauth2Client;
    }

    /**
     * Getter for oauth2Client to ensure it's initialized
     */
    get oauth2Client() {
        if (!this._oauth2Client) {
            this._oauth2Client = this._createOAuth2Client();
        }
        return this._oauth2Client;
    }

    set oauth2Client(client) {
        this._oauth2Client = client;
    }

    /**
     * Set a custom OAuth2 client (useful for testing)
     */
    setOAuth2Client(client) {
        this.oauth2Client = client;
    }

    /**
     * Factory to create OAuth2 Client
     */
    _createOAuth2Client() {
        return new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    /**
     * Internal helper to get authenticated client
     */
    _getAuth(pimpinan) {
        // We create a new instance to avoid state leakage between concurrent requests
        const auth = this._createOAuth2Client();

        auth.setCredentials({
            access_token: pimpinan.google_access_token,
            refresh_token: pimpinan.google_refresh_token,
            expiry_date: pimpinan.google_token_expiry
        });

        return auth;
    }

    /**
     * Generate Auth URL for Pimpinan
     */
    getAuthUrl(id_pimpinan) {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline', // Required for refresh token
            scope: ['https://www.googleapis.com/auth/calendar.events'],
            state: id_pimpinan, // Pass pimpinan ID to state
            prompt: 'consent' // Ensure we always get a refresh token
        });
    }

    /**
     * Exchange code for tokens
     */
    async getTokens(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }

    /**
     * Create or Update Calendar Event
     */
    async syncEvent(pimpinan, agenda, existingEventId = null) {
        try {
            const auth = this._getAuth(pimpinan);
            const calendar = google.calendar({ version: 'v3', auth });

            // Formatting Date & Time properly
            const dateStr = typeof agenda.tanggal_kegiatan === 'string' 
                ? agenda.tanggal_kegiatan 
                : new Date(agenda.tanggal_kegiatan).toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
            
            const formatTime = (timeStr) => {
                if (!timeStr) return '00:00';
                const parts = timeStr.split(':');
                return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            };

            const startTime = formatTime(agenda.waktu_mulai);
            const endTime = formatTime(agenda.waktu_selesai);

            const event = {
                summary: agenda.nama_kegiatan,
                location: agenda.lokasi_kegiatan,
                description: `
Detail Agenda (SIMAP) :
Perihal: ${agenda.perihal || '-'}
No. Surat: ${agenda.nomor_surat || '-'}
Tgl. Surat: ${agenda.tanggal_surat || '-'}
Keterangan:
${agenda.keterangan || 'Tidak ada keterangan tambahan.'}
`.trim(),
                start: {
                    dateTime: `${dateStr}T${startTime}:00`,
                    timeZone: 'Asia/Jakarta',
                },
                end: {
                    dateTime: `${dateStr}T${endTime}:00`,
                    timeZone: 'Asia/Jakarta',
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 30 },
                    ],
                },
            };

            if (existingEventId) {
                const res = await calendar.events.patch({
                    calendarId: 'primary',
                    eventId: existingEventId,
                    resource: event,
                });
                return res.data.id;
            } else {
                const res = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                });
                return res.data.id;
            }
        } catch (error) {
            console.error('Google Calendar Sync Error:', error);
            throw error;
        }
    }

    /**
     * Delete Calendar Event
     */
    async deleteEvent(pimpinan, eventId) {
        if (!eventId) return;
        try {
            const auth = this._getAuth(pimpinan);
            const calendar = google.calendar({ version: 'v3', auth });

            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
            });
        } catch (error) {
            if (error.code !== 410 && error.code !== 404) {
                console.error('Google Calendar Delete Error:', error);
                throw error;
            }
        }
    }
}

module.exports = new GoogleCalendarHelper();
