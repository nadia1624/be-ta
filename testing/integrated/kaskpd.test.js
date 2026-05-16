const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { KASKPD, sequelize } = require('../../models');

describe('KaSKPD API Database Integration Test (Real DB)', () => {
    let adminToken;
    let userToken;
    const secret = process.env.JWT_SECRET || 'secret';

    beforeAll(async () => {
        // Pastikan koneksi database berhasil dibuat
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        // Bersihkan seluruh data KaSKPD di tabel asli KASKPDs sebelum setiap pengujian
        // Gunakan truncate dengan cascade jika ada constraints
        await KASKPD.destroy({ where: {}, truncate: { cascade: true }, force: true });

        // Siapkan token Admin & Pemohon untuk autentikasi rute
        adminToken = jwt.sign({ id_user: 'U001', nama_role: 'Admin' }, secret);
        userToken = jwt.sign({ id_user: 'U002', nama_role: 'Pemohon' }, secret);
    });

    afterAll(async () => {
        // Tutup koneksi database setelah seluruh pengujian selesai
        await sequelize.close();
    });

    /**
     * ─── GET /api/kaskpd ───
     */
    describe('GET /api/kaskpd', () => {
        it('should get all KaSKPD with 200 status from database', async () => {
            // Masukkan data langsung ke database pengujian
            await KASKPD.create({ id_ka_skpd: 'KS001', nama_instansi: 'Dinas Sosial' });
            await KASKPD.create({ id_ka_skpd: 'KS002', nama_instansi: 'Dinas Komunikasi' });

            const res = await request(app)
                .get('/api/kaskpd')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].id_ka_skpd).toBe('KS001');
            expect(res.body.data[1].id_ka_skpd).toBe('KS002');
        });
    });

    /**
     * ─── POST /api/kaskpd ───
     */
    describe('POST /api/kaskpd', () => {
        it('should auto-generate ID and create new KaSKPD with 201 status', async () => {
            const payload = { nama_instansi: 'Dinas Pendidikan' };

            const res = await request(app)
                .post('/api/kaskpd')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id_ka_skpd).toBe('KS001'); // ID pertama harus KS001
            expect(res.body.data.nama_instansi).toBe('Dinas Pendidikan');

            // Verifikasi langsung ke database pengujian
            const dbRecord = await KASKPD.findByPk('KS001');
            expect(dbRecord).not.toBeNull();
            expect(dbRecord.nama_instansi).toBe('Dinas Pendidikan');
        });

        it('should create with manual ID if provided', async () => {
            const payload = { id_ka_skpd: 'KS999', nama_instansi: 'Badan Pendapatan' };

            const res = await request(app)
                .post('/api/kaskpd')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id_ka_skpd).toBe('KS999');

            // Verifikasi di DB
            const dbRecord = await KASKPD.findByPk('KS999');
            expect(dbRecord).not.toBeNull();
        });

        it('should return 400 if nama_instansi is empty', async () => {
            const res = await request(app)
                .post('/api/kaskpd')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nama_instansi: '' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Nama instansi harus diisi');
        });

        it('should return 400 if manual ID already exists in database', async () => {
            // Masukkan data bentrok ke DB
            await KASKPD.create({ id_ka_skpd: 'KS123', nama_instansi: 'Dinas Tata Ruang' });

            const payload = { id_ka_skpd: 'KS123', nama_instansi: 'Dinas Tata Kota' };

            const res = await request(app)
                .post('/api/kaskpd')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('sudah ada');
        });
    });

    /**
     * ─── PUT /api/kaskpd/:id ───
     */
    describe('PUT /api/kaskpd/:id', () => {
        it('should update KaSKPD and return 200 status', async () => {
            await KASKPD.create({ id_ka_skpd: 'KS005', nama_instansi: 'Dinas Pariwisata' });

            const res = await request(app)
                .put('/api/kaskpd/KS005')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nama_instansi: 'Dinas Pariwisata & Kebudayaan' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verifikasi pembaruan langsung di database
            const dbRecord = await KASKPD.findByPk('KS005');
            expect(dbRecord.nama_instansi).toBe('Dinas Pariwisata & Kebudayaan');
        });

        it('should return 404 if KaSKPD to update is not found', async () => {
            const res = await request(app)
                .put('/api/kaskpd/KS404')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nama_instansi: 'Tidak Ada' });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    /**
     * ─── DELETE /api/kaskpd/:id ───
     */
    describe('DELETE /api/kaskpd/:id', () => {
        it('should delete KaSKPD and return 200 status', async () => {
            await KASKPD.create({ id_ka_skpd: 'KS008', nama_instansi: 'Dinas Perhubungan' });

            const res = await request(app)
                .delete('/api/kaskpd/KS008')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verifikasi bahwa data benar-benar dihapus dari DB
            const dbRecord = await KASKPD.findByPk('KS008');
            expect(dbRecord).toBeNull();
        });
    });
});
