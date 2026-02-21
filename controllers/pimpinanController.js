const BaseController = require('./BaseController');
const { Pimpinan, PeriodeJabatan, JabatanPimpinan, Periode } = require('../models');

class PimpinanController extends BaseController {
    /**
     * Helper to generate ID
     */
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
                nama_pimpinan, nip, email, no_hp, 
                id_periode, id_jabatan, status_aktif 
            } = req.body;

            // 1. Find or Create Pimpinan
            let pimpinan = await Pimpinan.findOne({ where: { nip } });
            
            if (!pimpinan) {
                const newId = await this.generateId();
                pimpinan = await Pimpinan.create({
                    id_pimpinan: newId,
                    nama_pimpinan,
                    nip,
                    email,
                    no_hp
                });
            } else {
                // Update existing pimpinan info
                await pimpinan.update({ nama_pimpinan, email, no_hp });
            }

            let assignment = await PeriodeJabatan.findOne({
                where: {
                    id_jabatan: id_jabatan,
                    id_periode: id_periode
                }
            });

            if (assignment) {
                await assignment.update({
                    id_pimpinan: pimpinan.id_pimpinan,
                    status_aktif: status_aktif || 'aktif'
                });
            } else {
                await PeriodeJabatan.create({
                    id_pimpinan: pimpinan.id_pimpinan,
                    id_periode,
                    id_jabatan,
                    status_aktif: status_aktif || 'aktif'
                });
            }

            return this.sendResponse(res, 200, true, 'Data pimpinan berhasil disimpan', pimpinan);
        } catch (error) {
            return this.sendError(res, error, 'Error saving pimpinan');
        }
    }

    async deletePimpinan(req, res) {
        try {
            const { id_jabatan, id_periode } = req.body; 
            
            await PeriodeJabatan.destroy({
                where: {
                    id_jabatan: id_jabatan,
                    id_periode: id_periode
                }
            });
            
            return this.sendResponse(res, 200, true, 'Data berhasil dihapus dari periode ini');
        } catch (error) {
            return this.sendError(res, error, 'Error deleting pimpinan assignment');
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
            const data = await PeriodeJabatan.findAll({
                where: { status_aktif: 'aktif' },
                include: [
                    { model: Pimpinan, as: 'pimpinan' },
                    { model: Periode, as: 'periode' },
                    { model: JabatanPimpinan, as: 'jabatan' }
                ],
                order: [[{ model: Pimpinan, as: 'pimpinan' }, 'nama_pimpinan', 'ASC']]
            });
            return this.sendResponse(res, 200, true, 'Data active assignments berhasil diambil', data);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching active assignments');
        }
    }
}

module.exports = new PimpinanController();
