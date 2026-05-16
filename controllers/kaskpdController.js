const BaseController = require('./BaseController');
const { KASKPD, KASKPDPendamping } = require('../models');

class KASKPDController extends BaseController {

    async getAll(req, res) {
        try {
            const data = await KASKPD.findAll({
                order: [['id_ka_skpd', 'ASC']]
            });
            return this.sendResponse(res, 200, true, 'Data KaSKPD berhasil diambil', data);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil data KaSKPD');
        }
    }

    async create(req, res) {
        try {
            const { nama_instansi } = req.body;
            let { id_ka_skpd } = req.body;

            if (!nama_instansi) {
                return this.sendResponse(res, 400, false, 'Nama instansi harus diisi');
            }
            if (!id_ka_skpd) {
                const existing = await KASKPD.findAll({
                    attributes: ['id_ka_skpd']
                });

                let maxNumber = 0;
                existing.forEach(item => {
                    const match = item.id_ka_skpd.match(/^KS(\d+)$/);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num > maxNumber) maxNumber = num;
                    }
                });

                const nextNumber = maxNumber + 1;
                id_ka_skpd = `KS${nextNumber.toString().padStart(3, '0')}`;
            }

            const check = await KASKPD.findByPk(id_ka_skpd);
            if (check) {
                return this.sendResponse(res, 400, false, `ID KaSKPD ${id_ka_skpd} sudah ada`);
            }

            const newData = await KASKPD.create({
                id_ka_skpd,
                nama_instansi
            });

            return this.sendResponse(res, 201, true, 'KaSKPD berhasil ditambahkan', newData);
        } catch (error) {
            return this.sendError(res, error, 'Gagal menambahkan KaSKPD');
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { nama_instansi } = req.body;

            const data = await KASKPD.findByPk(id);
            if (!data) {
                return this.sendResponse(res, 404, false, 'KaSKPD tidak ditemukan');
            }

            await data.update({
                nama_instansi
            });

            return this.sendResponse(res, 200, true, 'KaSKPD berhasil diupdate', data);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengupdate KaSKPD');
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const data = await KASKPD.findByPk(id);

            if (!data) {
                return this.sendResponse(res, 404, false, 'KaSKPD tidak ditemukan');
            }

            const isUsed = await KASKPDPendamping.findOne({
                where: { id_ka_skpd: id }
            });

            if (isUsed) {
                return this.sendResponse(res, 400, false, 'Data KaSKPD tidak dapat dihapus karena sudah digunakan dalam agenda pimpinan');
            }

            await data.destroy();
            return this.sendResponse(res, 200, true, 'KaSKPD berhasil dihapus');
        } catch (error) {
            return this.sendError(res, error, 'Gagal menghapus KaSKPD');
        }
    }
}

module.exports = new KASKPDController();
