const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { Pimpinan, PeriodeJabatan, PimpinanAjudan, JabatanPimpinan, Periode, sequelize } = require('../../models');

describe('Pimpinan API Database Integration Test (Real DB)', () => {
    let adminToken;
    let userToken;
    let ajudanToken;
    const secret = process.env.JWT_SECRET || 'secret';

    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        // Clean database in correct dependency order
        await PimpinanAjudan.destroy({ where: {}, force: true });
        await PeriodeJabatan.destroy({ where: {}, force: true });
        await Pimpinan.destroy({ where: {}, force: true });
        await JabatanPimpinan.destroy({ where: {}, force: true });
        await Periode.destroy({ where: {}, force: true });

        // Seed dependency tables
        await JabatanPimpinan.create({ id_jabatan: 'JB001', nama_jabatan: 'Walikota' });
        await Periode.create({ id_periode: 'PD001', nama_periode: 'Periode 2021-2026', tahun_mulai: 2021, tahun_selesai: 2026, status_aktif: 'aktif' });

        adminToken = jwt.sign({ id_user: 'U001', nama_role: 'Admin' }, secret);
        userToken = jwt.sign({ id_user: 'U002', nama_role: 'Pemohon' }, secret);
        ajudanToken = jwt.sign({ id_user: 'U003', nama_role: 'Ajudan' }, secret);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    /**
     * ─── GET /api/pimpinan ───
     */
    describe('GET /api/pimpinan', () => {
        it('should return all pimpinan with 200 status', async () => {
            const leader = await Pimpinan.create({
                id_pimpinan: 'P001',
                nama_pimpinan: 'Dr. Hendri',
                nip: '19751234567890',
                email: 'hendri@test.com',
                no_hp: '0812222333'
            });

            await PeriodeJabatan.create({
                id_periode_jabatan: 'PJ001',
                id_pimpinan: 'P001',
                id_jabatan: 'JB001',
                id_periode: 'PD001',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .get('/api/pimpinan')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id_pimpinan).toBe('P001');
            expect(res.body.data[0].id_jabatan).toBe('JB001');
        });

        it('should return 403 if accessed by unauthorized roles', async () => {
            const res = await request(app)
                .get('/api/pimpinan')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    /**
     * ─── POST /api/pimpinan ───
     */
    describe('POST /api/pimpinan', () => {
        const payload = {
            nama_pimpinan: 'Dr. Hendri',
            nip: '19751234567890',
            email: 'hendri@test.com',
            no_hp: '0812222333',
            id_periode: 'PD001',
            id_jabatan: 'JB001',
            status_aktif: 'aktif'
        };

        it('should create new pimpinan and return 200 status', async () => {
            const res = await request(app)
                .post('/api/pimpinan')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Data pimpinan berhasil disimpan');

            // Verify db state
            const dbPimpinan = await Pimpinan.findByPk('P001');
            expect(dbPimpinan).not.toBeNull();
            expect(dbPimpinan.nama_pimpinan).toBe('Dr. Hendri');

            const dbPJ = await PeriodeJabatan.findOne({ where: { id_pimpinan: 'P001' } });
            expect(dbPJ).not.toBeNull();
            expect(dbPJ.id_jabatan).toBe('JB001');
        });

        it('should return 400 if NIP already exists', async () => {
            await Pimpinan.create({
                id_pimpinan: 'P002',
                nama_pimpinan: 'Pimpinan Lain',
                nip: payload.nip,
                email: 'other@test.com',
                no_hp: '081234567'
            });

            const res = await request(app)
                .post('/api/pimpinan')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('NIP pimpinan sudah terdaftar');
        });

        it('should return 400 if email already exists', async () => {
            await Pimpinan.create({
                id_pimpinan: 'P002',
                nama_pimpinan: 'Pimpinan Lain',
                nip: '1111111111111',
                email: payload.email,
                no_hp: '081234567'
            });

            const res = await request(app)
                .post('/api/pimpinan')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Email pimpinan sudah terdaftar');
        });

        it('should return 400 if the position is already taken by another pimpinan', async () => {
            // P005 takes JB001 on PD001
            await Pimpinan.create({
                id_pimpinan: 'P005',
                nama_pimpinan: 'Walikota Lama',
                nip: '2222222222222',
                email: 'walikotalama@test.com',
                no_hp: '081234567'
            });

            await PeriodeJabatan.create({
                id_periode_jabatan: 'PJ005',
                id_pimpinan: 'P005',
                id_jabatan: 'JB001',
                id_periode: 'PD001',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .post('/api/pimpinan')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Jabatan ini sudah terisi');
        });
    });

    /**
     * ─── GET /api/pimpinan/jabatan ───
     */
    describe('GET /api/pimpinan/jabatan', () => {
        it('should return all positions with 200 status', async () => {
            const res = await request(app)
                .get('/api/pimpinan/jabatan')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id_jabatan).toBe('JB001');
        });
    });

    /**
     * ─── GET /api/pimpinan/active-assignments ───
     */
    describe('GET /api/pimpinan/active-assignments', () => {
        it('should fetch active assignments for Admin role with 200 status', async () => {
            const res = await request(app)
                .get('/api/pimpinan/active-assignments')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    /**
     * ─── POST /api/pimpinan/resend-sync/:id_pimpinan ───
     */
    describe('POST /api/pimpinan/resend-sync/:id_pimpinan', () => {
        it('should resend sync invitation to pimpinan email and return 200 status', async () => {
            await Pimpinan.create({
                id_pimpinan: 'P001',
                nama_pimpinan: 'Dr. Hendri',
                nip: '19751234567890',
                email: 'hendri@test.com',
                no_hp: '0812222333'
            });

            const res = await request(app)
                .post('/api/pimpinan/resend-sync/P001')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Undangan sinkronisasi berhasil dikirim ulang');
        });

        it('should return 404 if pimpinan not found or has no email', async () => {
            const res = await request(app)
                .post('/api/pimpinan/resend-sync/P999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Pimpinan tidak ditemukan');
        });
    });
});
