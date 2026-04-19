jest.mock('../../../models', () => {
    const tx = {
        commit:   jest.fn(() => Promise.resolve()),
        rollback: jest.fn(() => Promise.resolve()),
    };
    return {
        DraftBerita: {
            findAndCountAll: jest.fn(),
            findOne:         jest.fn(),
            findAll:         jest.fn(),
            findByPk:        jest.fn(),
            create:          jest.fn(),
        },
        DokumentasiBerita: {
            destroy:    jest.fn(),
            bulkCreate: jest.fn(),
            findOne:    jest.fn(),
        },
        Penugasan:        { findByPk: jest.fn() },
        RevisiDraftBerita:{ create: jest.fn(), findOne: jest.fn() },
        User:             { findAll: jest.fn() },
        Agenda:           {},
        AgendaPimpinan:   {},
        PeriodeJabatan:   {},
        Pimpinan:         {},
        sequelize:        { transaction: jest.fn(() => Promise.resolve(tx)), _tx: tx },
    };
});
jest.mock('../../../helpers/pushNotificationHelper', () => ({
    sendPushNotification: jest.fn(() => Promise.resolve()),
}));

const BeritaController    = require('../../../controllers/beritaController');
const { sendPushNotification } = require('../../../helpers/pushNotificationHelper');
const {
    DraftBerita, DokumentasiBerita, Penugasan, RevisiDraftBerita, sequelize,
} = require('../../../models');

const mockTx = sequelize._tx;

describe('BeritaController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            query:  {},
            params: {},
            body:   {},
            user:   { id_user: 'USR001' },
            files:  [],
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json:   jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
        sequelize.transaction.mockImplementation(() => Promise.resolve(mockTx));
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('1. getPublicBerita()', () => {
        test('1. Return 200 dengan pagination default (page=1, limit=10)', async () => {
            DraftBerita.findAndCountAll.mockResolvedValue({ count: 5, rows: [{}, {}] });

            await BeritaController.getPublicBerita(req, res);

            expect(DraftBerita.findAndCountAll).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 10, offset: 0, where: { status_draft: 'approved' } })
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Berita berhasil diambil',
                data: expect.objectContaining({ pagination: expect.objectContaining({ currentPage: 1, totalItems: 5 }) }),
            }));
        });

        test('2. Return 200 dengan pagination kustom (page=3, limit=5, offset=10)', async () => {
            req.query = { page: '3', limit: '5' };
            DraftBerita.findAndCountAll.mockResolvedValue({ count: 30, rows: [] });

            await BeritaController.getPublicBerita(req, res);

            expect(DraftBerita.findAndCountAll).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 5, offset: 10 })
            );
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ pagination: expect.objectContaining({ currentPage: 3, totalPages: 6 }) }),
            }));
        });

        test('3. Return 200 dengan array kosong jika tidak ada data', async () => {
            DraftBerita.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

            await BeritaController.getPublicBerita(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ data: [] }) })
            );
        });

        test('4. Return 500 jika database error', async () => {
            DraftBerita.findAndCountAll.mockRejectedValue(new Error('db error'));

            await BeritaController.getPublicBerita(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('2. getPublicBeritaDetail()', () => {
        test('1. Return 200 jika berita ditemukan', async () => {
            req.params.id = 'DB001';
            DraftBerita.findOne.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.getPublicBeritaDetail(req, res);

            expect(DraftBerita.findOne).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id_draft_berita: 'DB001', status_draft: 'approved' } })
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Return 404 jika berita tidak ditemukan', async () => {
            req.params.id = 'DB999';
            DraftBerita.findOne.mockResolvedValue(null);

            await BeritaController.getPublicBeritaDetail(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Berita tidak ditemukan' }));
        });

        test('3. Return 500 jika database error', async () => {
            DraftBerita.findOne.mockRejectedValue(new Error());
            await BeritaController.getPublicBeritaDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('3. generateDraftId()', () => {
        test('1. Return DB001 jika belum ada data', async () => {
            DraftBerita.findOne.mockResolvedValue(null);
            expect(await BeritaController.generateDraftId()).toBe('DB001');
        });

        test('2. Increment dengan benar — DB001 → DB002', async () => {
            DraftBerita.findOne.mockResolvedValue({ id_draft_berita: 'DB001' });
            expect(await BeritaController.generateDraftId()).toBe('DB002');
        });

        test('3. Increment tiga digit — DB099 → DB100', async () => {
            DraftBerita.findOne.mockResolvedValue({ id_draft_berita: 'DB099' });
            expect(await BeritaController.generateDraftId()).toBe('DB100');
        });

        test('4. Fallback ke DB001 jika prefix bukan "DB"', async () => {
            DraftBerita.findOne.mockResolvedValue({ id_draft_berita: 'INVALID' });
            expect(await BeritaController.generateDraftId()).toBe('DB001');
        });

        test('5. Fallback ke DB001 jika suffix bukan angka', async () => {
            DraftBerita.findOne.mockResolvedValue({ id_draft_berita: 'DBxyz' });
            expect(await BeritaController.generateDraftId()).toBe('DB001');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('4. generateDokumentasiId()', () => {
        test('1. Return DK001 jika belum ada data', async () => {
            DokumentasiBerita.findOne.mockResolvedValue(null);
            expect(await BeritaController.generateDokumentasiId()).toBe('DK001');
        });

        test('2. Increment dengan benar — DK009 → DK010', async () => {
            DokumentasiBerita.findOne.mockResolvedValue({ id_dokumentasi: 'DK009' });
            expect(await BeritaController.generateDokumentasiId()).toBe('DK010');
        });

        test('4. Fallback jika suffix bukan angka (DKabc)', async () => {
            DokumentasiBerita.findOne.mockResolvedValue({ id_dokumentasi: 'DKabc' });
            expect(await BeritaController.generateDokumentasiId()).toBe('DK001');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('5. generateRevisiId()', () => {
        test('1. Return REV001 jika belum ada data', async () => {
            RevisiDraftBerita.findOne.mockResolvedValue(null);
            expect(await BeritaController.generateRevisiId()).toBe('REV001');
        });

        test('2. Increment dengan benar — REV009 → REV010', async () => {
            RevisiDraftBerita.findOne.mockResolvedValue({ id_revisi: 'REV009' });
            expect(await BeritaController.generateRevisiId()).toBe('REV010');
        });

        test('4. Fallback jika suffix bukan angka (REVabc)', async () => {
            RevisiDraftBerita.findOne.mockResolvedValue({ id_revisi: 'REVabc' });
            expect(await BeritaController.generateRevisiId()).toBe('REV001');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('6. submitDraftBerita()', () => {
        const BODY = { id_penugasan: 'PN1', judul_berita: 'Judul', isi_draft: 'Isi' };

        test('1. Return 400 jika semua field kosong (validasi input)', async () => {
            req.body = {};
            await BeritaController.submitDraftBerita(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTx.rollback).toHaveBeenCalled();
        });

        test('2. Return 400 jika judul_berita tidak ada', async () => {
            req.body = { id_penugasan: 'PN1', isi_draft: 'I' };
            await BeritaController.submitDraftBerita(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTx.rollback).toHaveBeenCalled();
        });

        test('3. Return 400 jika isi_draft tidak ada', async () => {
            req.body = { id_penugasan: 'PN1', judul_berita: 'J' };
            await BeritaController.submitDraftBerita(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockTx.rollback).toHaveBeenCalled();
        });

        test('4. Return 404 dan rollback jika penugasan tidak ditemukan', async () => {
            req.body = BODY;
            Penugasan.findByPk.mockResolvedValue(null);

            await BeritaController.submitDraftBerita(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Penugasan tidak ditemukan' }));
            expect(mockTx.rollback).toHaveBeenCalled();
        });

        test('5. Return 403 dan rollback jika submit sebelum tanggal agenda', async () => {
            req.body = BODY;
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            Penugasan.findByPk.mockResolvedValue({
                status: 'pending',
                agenda: { tanggal_kegiatan: tomorrow.toISOString().split('T')[0] },
                update: jest.fn(),
            });

            await BeritaController.submitDraftBerita(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockTx.rollback).toHaveBeenCalled();
        });

        test('6. Submit boleh dilakukan pada hari agenda (tanggal sama)', async () => {
            req.body = BODY;
            const today = new Date().toISOString().split('T')[0];
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: today }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.submitDraftBerita(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('7. Submit boleh dilakukan setelah tanggal agenda (past date)', async () => {
            req.body = BODY;
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.submitDraftBerita(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('8. Buat draft baru jika belum ada (branch: create)', async () => {
            req.body = BODY;
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.submitDraftBerita(req, res);

            expect(DraftBerita.create).toHaveBeenCalledWith(
                expect.objectContaining({ judul_berita: 'Judul', status_draft: 'draft' }),
                expect.any(Object)
            );
            expect(mockTx.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('9. Update draft yang sudah ada jika ditemukan (branch: update)', async () => {
            req.body = BODY;
            const existingDraft = { id_draft_berita: 'DB005', update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue({ status: 'progress', agenda: { tanggal_kegiatan: '2000-01-01' } });
            DraftBerita.findOne.mockResolvedValueOnce(existingDraft);

            await BeritaController.submitDraftBerita(req, res);

            expect(existingDraft.update).toHaveBeenCalledWith(
                expect.objectContaining({ judul_berita: 'Judul', status_draft: 'draft' }),
                expect.any(Object)
            );
            expect(DraftBerita.create).not.toHaveBeenCalled();
            expect(mockTx.commit).toHaveBeenCalled();
        });

        test('10. Penugasan status "pending" berubah menjadi "progress" setelah submit', async () => {
            req.body = BODY;
            const penugasan = { status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue(penugasan);
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.submitDraftBerita(req, res);

            expect(penugasan.update).toHaveBeenCalledWith({ status: 'progress' }, expect.any(Object));
        });

        test('11. Penugasan status bukan "pending" tidak berubah', async () => {
            req.body = BODY;
            const penugasan = { status: 'progress', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() };
            Penugasan.findByPk.mockResolvedValue(penugasan);
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.submitDraftBerita(req, res);

            expect(penugasan.update).not.toHaveBeenCalled();
        });

        test('12. Hapus dokumentasi jika deleted_dokumentasi_ids berupa JSON string ["DK001"]', async () => {
            req.body = { ...BODY, deleted_dokumentasi_ids: '["DK001"]' };
            const draft = { id_draft_berita: 'DB010', update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(draft);

            await BeritaController.submitDraftBerita(req, res);

            expect(DokumentasiBerita.destroy).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id_dokumentasi: ['DK001'], id_draft_berita: 'DB010' } })
            );
        });

        test('13. Hapus dokumentasi jika deleted_dokumentasi_ids berupa array', async () => {
            req.body = { ...BODY, deleted_dokumentasi_ids: ['DK002'] };
            const draft = { id_draft_berita: 'DB010', update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(draft);

            await BeritaController.submitDraftBerita(req, res);

            expect(DokumentasiBerita.destroy).toHaveBeenCalled();
        });

        test('14. Hapus dokumentasi jika deleted_dokumentasi_ids berupa string tunggal "DK003"', async () => {
            req.body = { ...BODY, deleted_dokumentasi_ids: 'DK003' };
            const draft = { id_draft_berita: 'DB010', update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(draft);

            await BeritaController.submitDraftBerita(req, res);

            expect(DokumentasiBerita.destroy).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id_dokumentasi: ['DK003'], id_draft_berita: 'DB010' } })
            );
        });

        test('15. JSON invalid fallback ke string — tidak crash, tetap return 201', async () => {
            req.body = { ...BODY, deleted_dokumentasi_ids: '{invalid' };
            const draft = { id_draft_berita: 'DB010', update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(draft);

            await BeritaController.submitDraftBerita(req, res);

            expect(DokumentasiBerita.destroy).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('16. Tidak memanggil bulkCreate jika tidak ada file diupload', async () => {
            req.body  = BODY;
            req.files = [];
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.submitDraftBerita(req, res);

            expect(DokumentasiBerita.bulkCreate).not.toHaveBeenCalled();
        });

        test('17. bulkCreate dipanggil dengan file_path yang benar untuk 1 file', async () => {
            req.body  = BODY;
            req.files = [{ filename: 'photo.jpg' }];
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });
            DokumentasiBerita.findOne.mockResolvedValue(null);

            await BeritaController.submitDraftBerita(req, res);

            expect(DokumentasiBerita.bulkCreate).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ file_path: 'photo.jpg' })]),
                expect.any(Object)
            );
        });

        test('18. Multiple file mendapat ID yang unik dan berurutan', async () => {
            req.body  = BODY;
            req.files = [{ filename: 'img1.jpg' }, { filename: 'img2.jpg' }];
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });
            DokumentasiBerita.findOne.mockResolvedValue(null);

            await BeritaController.submitDraftBerita(req, res);

            const docs = DokumentasiBerita.bulkCreate.mock.calls[0][0];
            expect(docs).toHaveLength(2);
            expect(docs[0].id_dokumentasi).not.toBe(docs[1].id_dokumentasi);
        });

        test('19. Return 500 dan rollback jika DraftBerita.create gagal', async () => {
            req.body = BODY;
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockRejectedValue(new Error('create failed'));

            await BeritaController.submitDraftBerita(req, res);

            expect(mockTx.rollback).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('20. Return 500 dan rollback jika draft.update gagal', async () => {
            req.body = BODY;
            const failDraft = { id_draft_berita: 'DB001', update: jest.fn(() => Promise.reject(new Error('fail'))) };
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(failDraft);

            await BeritaController.submitDraftBerita(req, res);

            expect(mockTx.rollback).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('21. Return 500 dan rollback jika DokumentasiBerita.destroy gagal', async () => {
            req.body = { ...BODY, deleted_dokumentasi_ids: '["DK001"]' };
            const draft = { id_draft_berita: 'DB010', update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(draft);
            DokumentasiBerita.destroy.mockRejectedValue(new Error('destroy failed'));

            await BeritaController.submitDraftBerita(req, res);

            expect(mockTx.rollback).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('22. Return 500 dan rollback jika DokumentasiBerita.bulkCreate gagal', async () => {
            req.body  = BODY;
            req.files = [{ filename: 'img.jpg' }];
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2000-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            DraftBerita.create.mockResolvedValue({ id_draft_berita: 'DB001' });
            DokumentasiBerita.findOne.mockResolvedValue(null);
            DokumentasiBerita.bulkCreate.mockRejectedValue(new Error('bulk fail'));

            await BeritaController.submitDraftBerita(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('23. Hapus dokumentasi jika deleted_dokumentasi_ids berupa string tunggal', async () => {
            req.body = { ...BODY, deleted_dokumentasi_ids: 'DK001' };
            const draft = { id_draft_berita: 'DB010', update: jest.fn(() => Promise.resolve()) };
            Penugasan.findByPk.mockResolvedValue({ status: 'pending', agenda: { tanggal_kegiatan: '2020-01-01' }, update: jest.fn() });
            DraftBerita.findOne.mockResolvedValueOnce(draft);
            
            await BeritaController.submitDraftBerita(req, res);
            expect(DokumentasiBerita.destroy).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ id_dokumentasi: ['DK001'] })
            }));
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('7. getDraftsReview()', () => {
        test('1. Return 200 dengan draft berstatus "draft" urutan DESC', async () => {
            DraftBerita.findAll.mockResolvedValue([]);

            await BeritaController.getDraftsReview(req, res);

            expect(DraftBerita.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ where: { status_draft: 'draft' }, order: [['tanggal_kirim', 'DESC']] })
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Return 500 jika database error', async () => {
            DraftBerita.findAll.mockRejectedValue(new Error());
            await BeritaController.getDraftsReview(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('8. getAllDrafts()', () => {
        test('1. Return 200 semua draft tanpa filter status, urutan DESC', async () => {
            DraftBerita.findAll.mockResolvedValue([{ id_draft_berita: 'DB001' }]);

            await BeritaController.getAllDrafts(req, res);

            const args = DraftBerita.findAll.mock.calls[0][0];
            expect(args.where).toBeUndefined();
            expect(args.order).toEqual([['tanggal_kirim', 'DESC']]);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Return 500 jika database error', async () => {
            DraftBerita.findAll.mockRejectedValue(new Error());
            await BeritaController.getAllDrafts(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('9. getMyDrafts()', () => {
        test('1. Return 200 dengan filter berdasarkan id_user user yang login', async () => {
            req.user = { id_user: 'STAF001' };
            DraftBerita.findAll.mockResolvedValue([]);

            await BeritaController.getMyDrafts(req, res);

            expect(DraftBerita.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id_user_staff: 'STAF001' } })
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Return 500 jika database error', async () => {
            DraftBerita.findAll.mockRejectedValue(new Error());
            await BeritaController.getMyDrafts(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('10. getDraftDetail()', () => {
        test('1. Return 200 dengan detail draft dan nested include', async () => {
            req.params.id = 'DB001';
            DraftBerita.findByPk.mockResolvedValue({ id_draft_berita: 'DB001' });

            await BeritaController.getDraftDetail(req, res);

            expect(DraftBerita.findByPk).toHaveBeenCalledWith('DB001', expect.objectContaining({ include: expect.any(Array) }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Return 404 jika draft tidak ditemukan', async () => {
            req.params.id = 'DB999';
            DraftBerita.findByPk.mockResolvedValue(null);

            await BeritaController.getDraftDetail(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Draft berita tidak ditemukan' }));
        });

        test('3. Return 500 jika database error', async () => {
            DraftBerita.findByPk.mockRejectedValue(new Error());
            await BeritaController.getDraftDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('11. reviewDraft()', () => {
        test('1. Return 400 jika status_draft tidak diisi', async () => {
            req.body = {};
            await BeritaController.reviewDraft(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Status tidak valid' }));
        });

        test('2. Return 400 jika status_draft tidak valid (bukan approved/review)', async () => {
            req.body = { status_draft: 'deleted' };
            await BeritaController.reviewDraft(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('3. Return 404 jika draft tidak ditemukan', async () => {
            req.params.id = 'DB999';
            req.body = { status_draft: 'approved' };
            DraftBerita.findByPk.mockResolvedValue(null);

            await BeritaController.reviewDraft(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Draft berita tidak ditemukan' }));
        });

        test('4. Status "approved" — update draft dan kirim notifikasi', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'approved', catatan: 'Bagus' };
            const draft = { id_draft_berita: 'DB001', id_user_staff: 'STAF1', judul_berita: 'Headline', update: jest.fn() };
            DraftBerita.findByPk.mockResolvedValue(draft);

            await BeritaController.reviewDraft(req, res);

            expect(draft.update).toHaveBeenCalledWith({ status_draft: 'approved', catatan: 'Bagus' });
            expect(sendPushNotification).toHaveBeenCalledWith('STAF1', expect.objectContaining({ title: 'Berita Disetujui' }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Draft berita berhasil disetujui' }));
        });

        test('5. Status "approved" — tidak membuat revisi log', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'approved' };
            DraftBerita.findByPk.mockResolvedValue({ id_user_staff: 'S', judul_berita: 'T', update: jest.fn() });

            await BeritaController.reviewDraft(req, res);

            expect(RevisiDraftBerita.create).not.toHaveBeenCalled();
        });

        test('6. Status "review" — update draft, buat revisi log, kirim notifikasi', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'review', catatan: 'Perbaiki typo' };
            const draft = { id_draft_berita: 'DB001', id_user_staff: 'STAF1', judul_berita: 'Judul', update: jest.fn() };
            DraftBerita.findByPk.mockResolvedValue(draft);
            RevisiDraftBerita.findOne.mockResolvedValue(null);
            RevisiDraftBerita.create.mockResolvedValue({});

            await BeritaController.reviewDraft(req, res);

            expect(RevisiDraftBerita.create).toHaveBeenCalledWith(
                expect.objectContaining({ id_revisi: 'REV001', id_draft_berita: 'DB001', catatan_revisi: 'Perbaiki typo' })
            );
            expect(sendPushNotification).toHaveBeenCalledWith('STAF1', expect.objectContaining({ title: 'Revisi Berita Diperlukan' }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Draft berita berhasil dikirim kembali untuk revisi' }));
        });

        test('7. Pastikan body notifikasi berisi judul_berita (approved)', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'approved' };
            DraftBerita.findByPk.mockResolvedValue({ id_user_staff: 'S', judul_berita: 'Breaking News', update: jest.fn() });

            await BeritaController.reviewDraft(req, res);

            expect(sendPushNotification).toHaveBeenCalledWith('S',
                expect.objectContaining({ body: expect.stringContaining('Breaking News') })
            );
        });

        test('8. Pastikan body notifikasi berisi catatan (review)', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'review', catatan: 'Kesalahan ejaan' };
            DraftBerita.findByPk.mockResolvedValue({ id_draft_berita: 'DB001', id_user_staff: 'S', judul_berita: 'T', update: jest.fn() });
            RevisiDraftBerita.findOne.mockResolvedValue(null);
            RevisiDraftBerita.create.mockResolvedValue({});

            await BeritaController.reviewDraft(req, res);

            expect(sendPushNotification).toHaveBeenCalledWith('S',
                expect.objectContaining({ body: expect.stringContaining('Kesalahan ejaan') })
            );
        });

        test('9. Return 500 jika draft.update gagal', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'approved' };
            DraftBerita.findByPk.mockResolvedValue({ update: jest.fn(() => Promise.reject(new Error('fail'))) });

            await BeritaController.reviewDraft(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('10. Return 500 jika RevisiDraftBerita.create gagal', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'review', catatan: 'Fix' };
            DraftBerita.findByPk.mockResolvedValue({ id_draft_berita: 'DB001', id_user_staff: 'S', judul_berita: 'T', update: jest.fn() });
            RevisiDraftBerita.findOne.mockResolvedValue(null);
            RevisiDraftBerita.create.mockRejectedValue(new Error('fail'));

            await BeritaController.reviewDraft(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('11. Return 500 jika database error pada findByPk', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'approved' };
            DraftBerita.findByPk.mockRejectedValue(new Error('db error'));

            await BeritaController.reviewDraft(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('12. Notify with default message if catatan is empty', async () => {
            req.params.id = 'DB001';
            req.body = { status_draft: 'review', catatan: '' };
            const draft = { id_draft_berita: 'DB001', id_user_staff: 'S1', judul_berita: 'T', update: jest.fn() };
            DraftBerita.findByPk.mockResolvedValue(draft);
            RevisiDraftBerita.create.mockResolvedValue({});
            
            await BeritaController.reviewDraft(req, res);
            expect(sendPushNotification).toHaveBeenCalledWith('S1', expect.objectContaining({
                body: expect.stringContaining('Cek detail revisi.')
            }));
        });
    });
});
