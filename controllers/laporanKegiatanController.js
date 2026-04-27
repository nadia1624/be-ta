const BaseController = require('./BaseController');
const { LaporanKegiatan, Penugasan, Agenda, User, SlotAgendaStaff, SlotWaktu, sequelize } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

class LaporanKegiatanController extends BaseController {

    async generateLaporanId(transaction = null) {
        const lastRecord = await LaporanKegiatan.findOne({
            where: { id_laporan: { [Op.like]: 'LK%' } },
            order: [['id_laporan', 'DESC']],
            attributes: ['id_laporan'],
            transaction
        });

        let nextNum = 1;
        if (lastRecord) {
            const num = parseInt(lastRecord.id_laporan.substring(2));
            if (!isNaN(num)) nextNum = num + 1;
        }
        return `LK${nextNum.toString().padStart(3, '0')}`;
    }

    /**
     * POST /api/laporan-kegiatan
     * Staff submits a progress report for their assigned task.
     * Accepts: id_penugasan, deskripsi_laporan, catatan_laporan, dokumentasi (file)
     */
    async addLaporan(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_user, nama_role } = req.user;
            const isStaff = nama_role === 'Staff Protokol' || nama_role === 'Staf Protokol';

            if (!isStaff) {
                if (transaction) await transaction.rollback();
                return this.sendResponse(res, 403, false, 'Hanya Staff Protokol yang dapat menambahkan laporan');
            }

            const { id_penugasan, deskripsi_laporan, catatan_laporan } = req.body;

            if (!id_penugasan || !deskripsi_laporan) {
                if (transaction) await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Penugasan dan deskripsi laporan wajib diisi');
            }

            // Verify that this staff member is assigned to this penugasan
            const penugasan = await Penugasan.findOne({
                where: { id_penugasan },
                include: [
                    {
                        model: SlotAgendaStaff,
                        as: 'slotAgendaStaffs',
                        where: { id_user_staff: id_user },
                        required: true
                    },
                    {
                        model: Agenda,
                        as: 'agenda',
                        attributes: ['id_agenda', 'tanggal_kegiatan']
                    }
                ],
                transaction
            });

            if (!penugasan) {
                if (transaction) await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Penugasan tidak ditemukan atau Anda tidak memiliki akses');
            }

            // Verify if today is >= agenda date
            const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
            const agendaDate = penugasan.agenda?.tanggal_kegiatan;

            if (agendaDate && today < agendaDate) {
                if (transaction) await transaction.rollback();
                return this.sendResponse(res, 403, false, `Laporan hanya dapat ditambahkan pada hari H (${agendaDate}) atau setelah kegiatan berlangsung`);
            }

            const id_laporan = await this.generateLaporanId(transaction);

            let dokumentasi_laporan = null;
            if (req.file) {
                dokumentasi_laporan = req.file.filename;
            }

            const laporan = await LaporanKegiatan.create({
                id_laporan,
                id_penugasan,
                id_user_staff: id_user,
                deskripsi_laporan: deskripsi_laporan.slice(0, 50), // model has VARCHAR(50)
                catatan_laporan: catatan_laporan || null,
                dokumentasi_laporan
            }, { transaction });

            // Update penugasan status to 'progress' if it's currently 'pending'
            if (penugasan.status === 'pending' || !penugasan.status) {
                await penugasan.update({ status: 'progress' }, { transaction });
            }

            await transaction.commit();

            return this.sendResponse(res, 201, true, 'Laporan berhasil ditambahkan', laporan);
        } catch (error) {
            if (transaction) await transaction.rollback();
            return this.sendError(res, error, 'Gagal menambahkan laporan');
        }
    }

    /**
     * GET /api/laporan-kegiatan/penugasan/:id_penugasan
     * Get all progress reports for a specific penugasan.
     */
    async getLaporanByPenugasan(req, res) {
        try {
            const { id_penugasan } = req.params;
            const { id_user, nama_role } = req.user;
            const isStaff = nama_role === 'Staff Protokol' || nama_role === 'Staf Protokol';

            // For staff, verify they belong to this penugasan
            if (isStaff) {
                const assignment = await SlotAgendaStaff.findOne({
                    where: { id_penugasan, id_user_staff: id_user }
                });
                if (!assignment) {
                    return this.sendResponse(res, 403, false, 'Anda tidak memiliki akses ke penugasan ini');
                }
            }

            const laporan = await LaporanKegiatan.findAll({
                where: { id_penugasan },
                include: [
                    { model: User, as: 'staff', attributes: ['id_user', 'nama'] }
                ],
                order: [['createdAt', 'DESC']]
            });

            return this.sendResponse(res, 200, true, 'Data laporan berhasil diambil', laporan);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil laporan');
        }
    }

    /**
     * DELETE /api/laporan-kegiatan/:id_laporan
     * Staff can delete their own laporan entry.
     */
    async deleteLaporan(req, res) {
        try {
            const { id_laporan } = req.params;
            const { id_user } = req.user;

            const laporan = await LaporanKegiatan.findOne({
                where: { id_laporan, id_user_staff: id_user }
            });

            if (!laporan) {
                return this.sendResponse(res, 404, false, 'Laporan tidak ditemukan atau bukan milik Anda');
            }

            // Delete the file if it exists
            if (laporan.dokumentasi_laporan) {
                const filePath = path.join(__dirname, '../uploads/laporan', laporan.dokumentasi_laporan);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            await laporan.destroy();

            return this.sendResponse(res, 200, true, 'Laporan berhasil dihapus');
        } catch (error) {
            return this.sendError(res, error, 'Gagal menghapus laporan');
        }
    }
}

module.exports = new LaporanKegiatanController();
