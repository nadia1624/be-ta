const BaseController = require('./BaseController');
const { PimpinanAjudan, User, PeriodeJabatan, Pimpinan, JabatanPimpinan, Periode, Sequelize, sequelize } = require('../models');

class PenugasanAjudanController extends BaseController {
    
    async getAllAssignments(req, res) {
        try {
            const data = await PimpinanAjudan.findAll({
                include: [
                    { 
                        model: User, 
                        as: 'ajudan',
                        attributes: ['id_user', 'nama', 'nip', 'foto_profil']
                    },
                    {
                        model: PeriodeJabatan,
                        as: 'periodeJabatan',
                        on: {
                            id_jabatan: { [Sequelize.Op.col]: 'PimpinanAjudan.id_jabatan' },
                            id_periode: { [Sequelize.Op.col]: 'PimpinanAjudan.id_periode' }
                        },
                        include: [
                            { model: Pimpinan, as: 'pimpinan' },
                            { model: JabatanPimpinan, as: 'jabatan' },
                            { model: Periode, as: 'periode' }
                        ]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            return this.sendResponse(res, 200, true, 'Data assignments berhasil diambil', data);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching assignments');
        }
    }

    async createAssignment(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_user_ajudan, id_jabatan, id_periode, keterangan } = req.body;

            // 1. Check if assignment in THIS period already exists for THIS ajudan
            const existing = await PimpinanAjudan.findOne({
                where: {
                    id_user_ajudan,
                    id_periode
                }
            });

            if (existing) {
                await transaction.rollback();
                return this.sendResponse(res, 400, false, 'Ajudan ini sudah memiliki penugasan di periode yang sama');
            }

            // 2. Check if this is the first assignment for this Ajudan
            const assignmentCount = await PimpinanAjudan.count({
                where: { id_user_ajudan }
            });

            // 3. Create assignment
            // If it's the first one, default it to 'aktif'
            const newAssignment = await PimpinanAjudan.create({
                id_user_ajudan,
                id_jabatan,
                id_periode,
                keterangan: keterangan || 'Penugasan Ajudan',
                status_aktif: assignmentCount === 0 ? 'aktif' : 'nonaktif'
            }, { transaction });

            await transaction.commit();
            return this.sendResponse(res, 201, true, 'Penugasan berhasil dibuat', newAssignment);
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Error creating assignment');
        }
    }

    async setActiveAssignment(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id_user_ajudan, id_jabatan, id_periode } = req.body;

            // 1. Deactivate all existing assignments for this Ajudan
            await PimpinanAjudan.update(
                { status_aktif: 'nonaktif' },
                { 
                    where: { id_user_ajudan },
                    transaction 
                }
            );

            // 2. Activate the selected one
            const [updated] = await PimpinanAjudan.update(
                { status_aktif: 'aktif' },
                { 
                    where: { 
                        id_user_ajudan, 
                        id_jabatan, 
                        id_periode 
                    },
                    transaction 
                }
            );

            if (updated === 0) {
                await transaction.rollback();
                return this.sendResponse(res, 404, false, 'Penugasan tidak ditemukan');
            }

            await transaction.commit();
            return this.sendResponse(res, 200, true, 'Penugasan berhasil diaktifkan');
        } catch (error) {
            await transaction.rollback();
            return this.sendError(res, error, 'Error setting active assignment');
        }
    }

    async deleteAssignment(req, res) {
        try {
            const { id_user_ajudan, id_jabatan, id_periode } = req.body;

            if (!id_user_ajudan || !id_jabatan || !id_periode) {
                return this.sendResponse(res, 400, false, 'ID User, Jabatan, and Periode are required');
            }

            const deleted = await PimpinanAjudan.destroy({
                where: { 
                    id_user_ajudan, 
                    id_jabatan, 
                    id_periode 
                }
            });

            if (deleted) {
                return this.sendResponse(res, 200, true, 'Penugasan berhasil dihapus');
            } else {
                return this.sendResponse(res, 404, false, 'Penugasan tidak ditemukan');
            }
        } catch (error) {
            return this.sendError(res, error, 'Error deleting assignment');
        }
    }
}

module.exports = new PenugasanAjudanController();
