const BaseController = require('./BaseController');
const { Periode } = require('../models');

class PeriodeController extends BaseController {
    async createPeriode(req, res) {
        try {
            const { nama_periode, tanggal_mulai, tanggal_selesai, keterangan, status_periode } = req.body;
            const periodes = await Periode.findAll({
                attributes: ['id_periode']
            });

            let maxNumber = 0;
            periodes.forEach(p => {
                const match = p.id_periode.match(/^PD(\d+)$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNumber) maxNumber = num;
                }
            });

            const nextNumber = maxNumber + 1;
            const newId = `PD${nextNumber.toString().padStart(3, '0')}`;

            const newPeriode = await Periode.create({
                id_periode: newId,
                nama_periode,
                tanggal_mulai,
                tanggal_selesai,
                keterangan,
                status_periode: status_periode || 'aktif'
            });

            return this.sendResponse(res, 201, true, 'Periode berhasil ditambahkan', newPeriode);
        } catch (error) {
            return this.sendError(res, error, 'Error creating periode');
        }
    }

    async getAllPeriode(req, res) {
        try {
            const periodes = await Periode.findAll({
                order: [['createdAt', 'DESC']]
            });
            return this.sendResponse(res, 200, true, 'Data periode berhasil diambil', periodes);
        } catch (error) {
            return this.sendError(res, error, 'Error fetching periodes');
        }
    }

    async updatePeriode(req, res) {
        try {
            const { id } = req.params;
            const { nama_periode, tanggal_mulai, tanggal_selesai, keterangan, status_periode } = req.body;

            const periode = await Periode.findByPk(id);

            if (!periode) {
                return this.sendResponse(res, 404, false, 'Periode tidak ditemukan');
            }

            await periode.update({
                nama_periode,
                tanggal_mulai,
                tanggal_selesai,
                keterangan,
                status_periode
            });

            return this.sendResponse(res, 200, true, 'Periode berhasil diupdate', periode);
        } catch (error) {
            return this.sendError(res, error, 'Error updating periode');
        }
    }

    async deletePeriode(req, res) {
        try {
            const { id } = req.params;
            const periode = await Periode.findByPk(id);

            if (!periode) {
                return this.sendResponse(res, 404, false, 'Periode tidak ditemukan');
            }

            await periode.destroy();
            return this.sendResponse(res, 200, true, 'Periode berhasil dihapus');
        } catch (error) {
            return this.sendError(res, error, 'Error deleting periode');
        }
    }
}

module.exports = new PeriodeController();
