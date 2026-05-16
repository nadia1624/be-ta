const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { Periode, PeriodeJabatan, PimpinanAjudan, sequelize } = require('../../models');

describe('Periode API Database Integration Test (Real DB)', () => {
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
        await Periode.destroy({ where: {}, force: true });

        // Setup tokens
        adminToken = jwt.sign({ id_user: 'U001', nama_role: 'Admin' }, secret);
        userToken = jwt.sign({ id_user: 'U002', nama_role: 'Pemohon' }, secret);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    /**
     * ─── GET /api/periode ───
     */
    describe('GET /api/periode', () => {
        it('should return all periods with 200 status from database', async () => {
            await Periode.create({
                id_periode: 'PD001',
                nama_periode: 'Periode 2021-2026',
                tanggal_mulai: '2021-01-01',
                tanggal_selesai: '2026-12-31',
                keterangan: 'Periode Jabatan Walikota Ke-1',
                status_periode: 'aktif'
            });

            await Periode.create({
                id_periode: 'PD002',
                nama_periode: 'Periode 2026-2031',
                tanggal_mulai: '2026-01-01',
                tanggal_selesai: '2031-12-31',
                keterangan: 'Periode Jabatan Walikota Ke-2',
                status_periode: 'nonaktif'
            });

            const res = await request(app)
                .get('/api/periode')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].id_periode).toBe('PD002'); // Ordered by createdAt DESC
            expect(res.body.data[1].id_periode).toBe('PD001');
        });
    });

    /**
     * ─── POST /api/periode ───
     */
    describe('POST /api/periode', () => {
        const validPayload = {
            nama_periode: 'Periode Rencana 2026-2031',
            tanggal_mulai: '2026-01-01',
            tanggal_selesai: '2031-12-31',
            keterangan: 'Keterangan Rencana',
            status_periode: 'aktif'
        };

        it('should auto-generate ID starting from PD001 and create a new period', async () => {
            const res = await request(app)
                .post('/api/periode')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id_periode).toBe('PD001');
            expect(res.body.data.nama_periode).toBe('Periode Rencana 2026-2031');

            // Verify in DB
            const dbRecord = await Periode.findByPk('PD001');
            expect(dbRecord).not.toBeNull();
            expect(dbRecord.nama_periode).toBe('Periode Rencana 2026-2031');
        });

        it('should auto-increment properly to PD002 if PD001 already exists', async () => {
            await Periode.create({
                id_periode: 'PD001',
                nama_periode: 'Periode 2021-2026',
                tanggal_mulai: '2021-01-01',
                tanggal_selesai: '2026-12-31',
                status_periode: 'aktif'
            });

            const res = await request(app)
                .post('/api/periode')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id_periode).toBe('PD002');

            // Verify in DB
            const dbRecord = await Periode.findByPk('PD002');
            expect(dbRecord).not.toBeNull();
        });

        it('should return 400 if start date > end date', async () => {
            const invalidPayload = {
                ...validPayload,
                tanggal_mulai: '2031-12-31',
                tanggal_selesai: '2026-01-01'
            };

            const res = await request(app)
                .post('/api/periode')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidPayload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('tidak boleh lebih lama');
        });

        it('should return 403 if user is not Admin', async () => {
            const res = await request(app)
                .post('/api/periode')
                .set('Authorization', `Bearer ${userToken}`)
                .send(validPayload);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    /**
     * ─── PUT /api/periode/:id ───
     */
    describe('PUT /api/periode/:id', () => {
        const updatePayload = {
            nama_periode: 'Periode 2021-2026 Updated',
            tanggal_mulai: '2021-01-02',
            tanggal_selesai: '2026-12-30',
            keterangan: 'Keterangan Updated',
            status_periode: 'nonaktif'
        };

        it('should update period and return 200 status', async () => {
            await Periode.create({
                id_periode: 'PD001',
                nama_periode: 'Periode 2021-2026',
                tanggal_mulai: '2021-01-01',
                tanggal_selesai: '2026-12-31',
                status_periode: 'aktif'
            });

            const res = await request(app)
                .put('/api/periode/PD001')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatePayload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify in DB
            const dbRecord = await Periode.findByPk('PD001');
            expect(dbRecord.nama_periode).toBe('Periode 2021-2026 Updated');
            expect(dbRecord.tanggal_mulai).toBe('2021-01-02');
            expect(dbRecord.status_periode).toBe('nonaktif');
        });

        it('should return 404 if period to update is not found', async () => {
            const res = await request(app)
                .put('/api/periode/PD999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatePayload);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('tidak ditemukan');
        });

        it('should return 400 if start date > end date on update', async () => {
            await Periode.create({
                id_periode: 'PD001',
                nama_periode: 'Periode 2021-2026',
                tanggal_mulai: '2021-01-01',
                tanggal_selesai: '2026-12-31',
                status_periode: 'aktif'
            });

            const invalidPayload = {
                ...updatePayload,
                tanggal_mulai: '2026-12-31',
                tanggal_selesai: '2021-01-01'
            };

            const res = await request(app)
                .put('/api/periode/PD001')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidPayload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
});
