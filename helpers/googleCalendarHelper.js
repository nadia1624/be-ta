const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

class GoogleCalendarHelper {
    /**
     * Generate Auth URL for Pimpinan
     */
    getAuthUrl(id_pimpinan) {
        return oauth2Client.generateAuthUrl({
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
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    }

    /**
     * Create or Update Calendar Event
     */
    async syncEvent(pimpinan, agenda, existingEventId = null) {
        try {
            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            auth.setCredentials({
                access_token: pimpinan.google_access_token,
                refresh_token: pimpinan.google_refresh_token,
                expiry_date: pimpinan.google_token_expiry
            });

            const calendar = google.calendar({ version: 'v3', auth });

            // Formatting Date & Time properly
            // Sequelize DATEONLY might return a Date object or string depending on dialect
            const dateStr = typeof agenda.tanggal_kegiatan === 'string' 
                ? agenda.tanggal_kegiatan 
                : new Date(agenda.tanggal_kegiatan).toISOString().split('T')[0];
            
            // Ensure time has proper HH:mm format (sometimes seconds are present or missing)
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
                // Update existing event
                const res = await calendar.events.patch({
                    calendarId: 'primary',
                    eventId: existingEventId,
                    resource: event,
                });
                return res.data.id;
            } else {
                // Create new event
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
            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            auth.setCredentials({
                access_token: pimpinan.google_access_token,
                refresh_token: pimpinan.google_refresh_token,
                expiry_date: pimpinan.google_token_expiry
            });

            const calendar = google.calendar({ version: 'v3', auth });

            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
            });
        } catch (error) {
            // If event already deleted from Google, ignore
            if (error.code !== 410 && error.code !== 404) {
                console.error('Google Calendar Delete Error:', error);
                throw error;
            }
        }
    }
}

module.exports = new GoogleCalendarHelper();
