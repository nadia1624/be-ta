const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailHelper {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, 
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendSyncInvitation(pimpinan, authUrl) {
        const mailOptions = {
            from: `"SIMAP Admin" <${process.env.SMTP_USER}>`,
            to: pimpinan.email,
            subject: 'Undangan Sinkronisasi Google Calendar - SIMAP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #2c3e50; text-align: center;">Aktivasi Sinkronisasi Kalender</h2>
                    <p>Halo <strong>${pimpinan.nama_pimpinan}</strong>,</p>
                    <p>Admin SIMAP telah menambahkan/memperbarui data Anda. Untuk memudahkan manajemen jadwal, Anda dapat menyinkronkan agenda kegiatan Anda langsung ke Google Calendar pribadi Anda.</p>
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

    async sendPasswordResetEmail(user, resetUrl) {
        const mailOptions = {
            from: `"SIMAP Support" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Atur Ulang Kata Sandi - SIMAP',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff; color: #333;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0; font-size: 28px; letter-spacing: -0.025em;">SIMAP</h1>
                        <p style="color: #64748b; font-size: 14px; margin-top: 4px; font-weight: 500;">Sistem Informasi Manajemen Agenda Pimpinan</p>
                    </div>
                    
                    <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 16px;">Halo, ${user.nama}</h2>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                        Kami menerima permintaan untuk mengatur ulang kata sandi akun SIMAP Anda. Klik tombol di bawah ini untuk melanjutkan proses pengaturan ulang kata sandi.
                    </p>
                    
                    <div style="text-align: center; margin: 36px 0;">
                        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                            Atur Ulang Kata Sandi
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <strong>Penting:</strong> Tautan ini hanya berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta pengaturan ulang kata sandi ini, harap abaikan email ini.
                    </p>
                    
                    <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; border-top: 1px solid #f1f5f9; pt-24px; text-align: center;">
                        Jika tombol tidak berfungsi, salin tautan berikut ke browser Anda:<br>
                        <span style="word-break: break-all; color: #2563eb;">${resetUrl}</span>
                    </p>
                    
                    <div style="margin-top: 40px; text-align: center; color: #cbd5e1; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                        © ${new Date().getFullYear()} Protokol Komunikasi Pimpinan
                    </div>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Password Reset Email Sending Error:', error);
            throw error;
        }
    } 
    
}

module.exports = new EmailHelper();
