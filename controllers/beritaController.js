const BaseController = require('./BaseController');
const { DraftBerita, DokumentasiBerita } = require('../models');

class BeritaController extends BaseController {
    /**
     * Get approved berita for public landing page (no auth required)
     */
    async getPublicBerita(req, res) {
        try {
            const berita = await DraftBerita.findAll({
                where: { status_draft: 'approved' },
                include: [
                    {
                        model: DokumentasiBerita,
                        as: 'dokumentasis',
                        limit: 1
                    }
                ],
                order: [['tanggal_kirim', 'DESC']],
                limit: 6
            });

            return this.sendResponse(res, 200, true, 'Berita berhasil diambil', berita);
        } catch (error) {
            return this.sendError(res, error, 'Gagal mengambil berita');
        }
    }
}

module.exports = new BeritaController();
