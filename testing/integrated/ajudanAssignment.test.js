const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { PimpinanAjudan, User, Role, JabatanPimpinan, Periode, PeriodeJabatan, sequelize } = require('../../models');

describe('Ajudan Assignment API Database Integration Test (Real DB)', () => {
    let adminToken;
    let userToken;
    const secret = process.env.JWT_SECRET || 'secret';

    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        // Clean database in correct dependency order
        await PimpinanAjudan.destroy({ where: {}, force: true });
        await PeriodeJabatan.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
        await Role.destroy({ where: {}, force: true });
        await JabatanPimpinan.destroy({ where: {}, force: true });
        await Periode.destroy({ where: {}, force: true });

        // Seed dependencies
        await Role.bulkCreate([
            { id_role: 'R001', nama_role: 'Admin' },
            { id_role: 'R005', nama_role: 'Ajudan' },
            { id_role: 'R008', nama_role: 'Pemohon' }
        ]);

        await JabatanPimpinan.create({ id_jabatan: 'JB001', nama_jabatan: 'Walikota' });
        await Periode.create({ id_periode: 'PD001', nama_periode: 'Periode 2021-2026', tahun_mulai: 2021, tahun_selesai: 2026, status_aktif: 'aktif' });
        await PeriodeJabatan.create({ id_jabatan: 'JB001', id_periode: 'PD001', status_aktif: 'aktif' });

        // Seed target Ajudan user
        await User.create({
            id_user: 'U003',
            nama: 'Ajudan User',
            email: 'ajudan@test.com',
            password: 'password123',
            id_role: 'R005',
            nip: '3333333333',
            no_hp: '0812345677',
            status_aktif: 'aktif'
        });

        adminToken = jwt.sign({ id_user: 'U001', nama_role: 'Admin' }, secret);
        userToken = jwt.sign({ id_user: 'U002', nama_role: 'Pemohon' }, secret);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    /**
     * ─── GET /api/ajudan-assignments ───
     */
    describe('GET /api/ajudan-assignments', () => {
        it('should get all assignments with 200 status for Admin', async () => {
            await PimpinanAjudan.create({
                id_user_ajudan: 'U003',
                id_jabatan: 'JB001',
                id_periode: 'PD001',
                status_aktif: 'aktif',
                keterangan: 'Menjaga Walikota'
            });

            const res = await request(app)
                .get('/api/ajudan-assignments')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id_user_ajudan).toBe('U003');
        });

        it('should return 403 status (Forbidden) for non-Admin', async () => {
            const res = await request(app)
                .get('/api/ajudan-assignments')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    /**
     * ─── POST /api/ajudan-assignments ───
     */
    describe('POST /api/ajudan-assignments', () => {
        const payload = {
            id_user_ajudan: 'U003',
            id_jabatan: 'JB001',
            id_periode: 'PD001',
            keterangan: 'Menjaga Walikota'
        };

        it('should create an assignment with status "aktif" if it is the first assignment', async () => {
            const res = await request(app)
                .post('/api/ajudan-assignments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status_aktif).toBe('aktif');

            // Verify in DB
            const dbRecord = await PimpinanAjudan.findOne({
                where: { id_user_ajudan: 'U003', id_jabatan: 'JB001', id_periode: 'PD001' }
            });
            expect(dbRecord).not.toBeNull();
            expect(dbRecord.status_aktif).toBe('aktif');
        });

        it('should create an assignment with status "nonaktif" if not the first assignment', async () => {
            // Seed a different jabatan and period
            await JabatanPimpinan.create({ id_jabatan: 'JB002', nama_jabatan: 'Wakil Walikota' });
            await Periode.create({ id_periode: 'PD002', nama_periode: 'Periode 2026-2031', tahun_mulai: 2026, tahun_selesai: 2031, status_aktif: 'nonaktif' });
            await PeriodeJabatan.create({ id_jabatan: 'JB002', id_periode: 'PD002', status_aktif: 'aktif' });

            // Create first assignment
            await PimpinanAjudan.create({
                id_user_ajudan: 'U003',
                id_jabatan: 'JB002',
                id_periode: 'PD002',
                status_aktif: 'aktif',
                keterangan: 'Menjaga Wawali'
            });

            // Create second assignment (should be nonaktif)
            const res = await request(app)
                .post('/api/ajudan-assignments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status_aktif).toBe('nonaktif');
        });

        it('should return 400 if ajudan already has assignment in the same period', async () => {
            // First assignment
            await PimpinanAjudan.create({
                id_user_ajudan: 'U003',
                id_jabatan: 'JB001',
                id_periode: 'PD001',
                status_aktif: 'aktif',
                keterangan: 'Menjaga Walikota'
            });

            const res = await request(app)
                .post('/api/ajudan-assignments')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('sudah memiliki penugasan di periode yang sama');
        });
    });

    /**
     * ─── PUT /api/ajudan-assignments/set-active ───
     */
    describe('PUT /api/ajudan-assignments/set-active', () => {
        const payload = {
            id_user_ajudan: 'U003',
            id_jabatan: 'JB001',
            id_periode: 'PD001'
        };

        it('should set an assignment as active and return 200 status', async () => {
            await PimpinanAjudan.create({
                id_user_ajudan: 'U003',
                id_jabatan: 'JB001',
                id_periode: 'PD001',
                status_aktif: 'nonaktif',
                keterangan: 'Menjaga Walikota'
            });

            const res = await request(app)
                .put('/api/ajudan-assignments/set-active')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('berhasil diaktifkan');

            // Verify db
            const dbRecord = await PimpinanAjudan.findOne({
                where: { id_user_ajudan: 'U003', id_jabatan: 'JB001', id_periode: 'PD001' }
            });
            expect(dbRecord.status_aktif).toBe('aktif');
        });

        it('should return 404 if penugasan to activate is not found', async () => {
            const res = await request(app)
                .put('/api/ajudan-assignments/set-active')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Penugasan tidak ditemukan');
        });
    });

    /**
     * ─── POST /api/ajudan-assignments/delete ───
     */
    describe('POST /api/ajudan-assignments/delete', () => {
        const payload = {
            id_user_ajudan: 'U003',
            id_jabatan: 'JB001',
            id_periode: 'PD001'
        };

        it('should delete penugasan with 200 status', async () => {
            await PimpinanAjudan.create({
                id_user_ajudan: 'U003',
                id_jabatan: 'JB001',
                id_periode: 'PD001',
                status_aktif: 'aktif',
                keterangan: 'Menjaga Walikota'
            });

            const res = await request(app)
                .post('/api/ajudan-assignments/delete')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('berhasil dihapus');

            // Verify db is empty
            const dbRecord = await PimpinanAjudan.findOne({
                where: { id_user_ajudan: 'U003', id_jabatan: 'JB001', id_periode: 'PD001' }
            });
            expect(dbRecord).toBeNull();
        });

        it('should return 404 if penugasan to delete does not exist', async () => {
            const res = await request(app)
                .post('/api/ajudan-assignments/delete')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Penugasan tidak ditemukan');
        });

        it('should return 400 if some parameters are missing', async () => {
            const res = await request(app)
                .post('/api/ajudan-assignments/delete')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id_user_ajudan: 'U003' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('are required');
        });
    });
});
