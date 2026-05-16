const BaseController = require('./BaseController');
const { Pimpinan, PeriodeJabatan, PimpinanAjudan, JabatanPimpinan, Periode, Sequelize } = require('../models');
const emailHelper = require('../helpers/emailHelper');
const googleCalendarHelper = require('../helpers/googleCalendarHelper');

class PimpinanController extends BaseController {

    async generateId() {
        const list = await Pimpinan.findAll({ attributes: ['id_pimpinan'] });
        let max = 0;
        list.forEach(item => {
            const match = item.id_pimpinan.match(/^P(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > max) max = num;
            }
        });
        return `P${(max + 1).toString().padStart(3, '0')}`;
    }

    async getAllPimpinan(req, res) {
        try {
            const data = await PeriodeJabatan.findAll({
                include: [
                    { model: Pimpinan, as: 'pimpinan' },
                    { model: JabatanPimpinan, as: 'jabatan' },
                    { model: Periode, as: 'periode' }
                ],
                order: [['createdAt', 'DESC']]
            });
            return this.sendResponse(res, 200, true, 'Data pimpinan berhasil diambil', data);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching pimpinan');
        }
    }

    async createOrUpdatePimpinan(req, res) {
        try {
            const { 
                id_pimpinan, nama_pimpinan, nip, email, no_hp, 
                id_periode, id_jabatan, status_aktif 
            } = req.body;

            // 1. Uniqueness Checks
            if (nip) {
                const duplicateNip = await Pimpinan.findOne({
                    where: {
                        nip,
                        ...(id_pimpinan && { id_pimpinan: { [Sequelize.Op.ne]: id_pimpinan } })
                    }
                });
                if (duplicateNip) {
                    return this.sendResponse(res, 400, false, 'NIP pimpinan sudah terdaftar');
                }
            }

            if (email) {
                const duplicateEmail = await Pimpinan.findOne({
                    where: {
                        email,
                        ...(id_pimpinan && { id_pimpinan: { [Sequelize.Op.ne]: id_pimpinan } })
                    }
                });
                if (duplicateEmail) {
                    return this.sendResponse(res, 400, false, 'Email pimpinan sudah terdaftar');
                }
            }

            // 2. Find or Create Pimpinan
            let pimpinan;
            if (id_pimpinan) {
                pimpinan = await Pimpinan.findByPk(id_pimpinan);
                if (!pimpinan) {
                    return this.sendResponse(res, 404, false, 'Pimpinan tidak ditemukan');
                }
                await pimpinan.update({ nama_pimpinan, nip, email, no_hp });
            } else {
                const newId = await this.generateId();
                pimpinan = await Pimpinan.create({
                    id_pimpinan: newId,
                    nama_pimpinan,
                    nip,
                    email,
                    no_hp
                });
            }

            let assignment = await PeriodeJabatan.findOne({
                where: {
                    id_jabatan: id_jabatan,
                    id_periode: id_periode
                }
            });

            if (assignment && assignment.id_pimpinan && assignment.id_pimpinan !== pimpinan.id_pimpinan) {
                return this.sendResponse(res, 400, false, 'Jabatan ini sudah terisi oleh pimpinan lain pada periode tersebut');
            }

            if (assignment) {
                await assignment.update({
                    id_pimpinan: pimpinan.id_pimpinan,
                    status_aktif: status_aktif || 'aktif'
                });

                // Cascading deactivation for Ajudan assignments in the same period and position
                if (status_aktif === 'nonaktif') {
                    await PimpinanAjudan.update(
                        { status_aktif: 'nonaktif' },
                        { 
                            where: { 
                                id_jabatan: id_jabatan,
                                id_periode: id_periode 
                            } 
                        }
                    );
                }
            } else {
                await PeriodeJabatan.create({
                    id_pimpinan: pimpinan.id_pimpinan,
                    id_periode,
                    id_jabatan,
                    status_aktif: status_aktif || 'aktif'
                });
            }

            // 3. Send Google Calendar Sync Invitation if email is provided
            if (email) {
                try {
                    const authUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/google-auth/initiate/${pimpinan.id_pimpinan}`;
                    await emailHelper.sendSyncInvitation(pimpinan, authUrl);
                } catch (emailError) {
                    console.error('Failed to send sync invitation:', emailError);
                }
            }

            return this.sendResponse(res, 200, true, 'Data pimpinan berhasil disimpan dan undangan sinkronisasi telah dikirim', pimpinan);
        } catch (error) {
            return this.sendError(res, error, 'Error saving pimpinan');
        }
    }

    async getAllJabatan(req, res) {
        try {
            const jabatan = await JabatanPimpinan.findAll();
            return this.sendResponse(res, 200, true, 'Data jabatan berhasil diambil', jabatan);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching jabatan');
        }
    }

    async getAllPimpinanData(req, res) {
        try {
            const pimpinan = await Pimpinan.findAll({
                order: [['nama_pimpinan', 'ASC']]
            });
            return this.sendResponse(res, 200, true, 'Data pimpinan berhasil diambil', pimpinan);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching pimpinan list');
        }
    }

    async getActiveAssignments(req, res) {
        try {
            const { nama_role, id_user } = req.user;
            
            const whereClause = { status_aktif: 'aktif' };
            const include = [
                { model: Pimpinan, as: 'pimpinan' },
                { model: Periode, as: 'periode' },
                { model: JabatanPimpinan, as: 'jabatan' }
            ];

            // Only include PimpinanAjudan relation if user is an Ajudan
            if (nama_role === 'Ajudan') {
                include.push({
                    model: PimpinanAjudan,
                    as: 'pimpinanAjudans',
                    on: {
                        id_jabatan: { [Sequelize.Op.col]: 'PeriodeJabatan.id_jabatan' },
                        id_periode: { [Sequelize.Op.col]: 'PeriodeJabatan.id_periode' }
                    },
                    where: { 
                        id_user_ajudan: id_user,
                        status_aktif: 'aktif'
                    }
                });
            }

            const data = await PeriodeJabatan.findAll({
                where: whereClause,
                include: include,
                order: [[{ model: Pimpinan, as: 'pimpinan' }, 'nama_pimpinan', 'ASC']]
            });
            return this.sendResponse(res, 200, true, 'Data active assignments berhasil diambil', data);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching active assignments');
        }
    }

    async resendSyncInvitation(req, res) {
        try {
            const { id_pimpinan } = req.params;
            const pimpinan = await Pimpinan.findByPk(id_pimpinan);
            
            if (!pimpinan || !pimpinan.email) {
                return this.sendResponse(res, 404, false, 'Pimpinan tidak ditemukan atau tidak memiliki email');
            }

            const authUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/google-auth/initiate/${pimpinan.id_pimpinan}`;
            await emailHelper.sendSyncInvitation(pimpinan, authUrl);
            
            return this.sendResponse(res, 200, true, 'Undangan sinkronisasi berhasil dikirim ulang');
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengirim ulang undangan');
        }
    }
}

module.exports = new PimpinanController();
