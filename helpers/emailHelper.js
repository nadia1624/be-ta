const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailHelper {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    /**
     * Send Sync Invitation Email to Pimpinan
     */
    async sendSyncInvitation(pimpinan, authUrl) {
        const mailOptions = {
            from: `"SIMAP Admin" <${process.env.SMTP_USER}>`,
            to: pimpinan.email,
            subject: 'Undangan Sinkronisasi Google Calendar - SIMAP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #2c3e50; text-align: center;">Aktivasi Sinkronisasi Kalender</h2>
                    <p>Halo <strong>${pimpinan.nama_pimpinan}</strong>,</p>
                    <p>Admin SI-PEPIM telah menambahkan/memperbarui data Anda. Untuk memudahkan manajemen jadwal, Anda dapat menyinkronkan agenda kegiatan Anda langsung ke Google Calendar pribadi Anda.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${authUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                            Hubungkan ke Google Calendar
                        </a>
                    </div>
                    <p style="color: #7f8c8d; font-size: 14px;">Jika tombol di atas tidak berfungsi, silakan salin dan tempel link berikut ke browser Anda:</p>
                    <p style="word-break: break-all; color: #3498db; font-size: 12px;">${authUrl}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #95a5a6; text-align: center;">
                        Email ini dikirim otomatis oleh Sistem Informasi Penjadwalan Pimpinan (SIMAP).
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Email Sending Error:', error);
            throw error;
        }
    }
}

module.exports = new EmailHelper();
