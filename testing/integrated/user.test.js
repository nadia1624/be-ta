const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { User, Role, PimpinanAjudan, sequelize } = require('../../models');

describe('User API Database Integration Test (Real DB)', () => {
    let adminToken;
    const secret = process.env.JWT_SECRET || 'secret';

    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        // Clean database in correct dependency order
        await PimpinanAjudan.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
        await Role.destroy({ where: {}, force: true });

        // Seed roles needed for user tests
        await Role.bulkCreate([
            { id_role: 'R001', nama_role: 'Admin' },
            { id_role: 'R008', nama_role: 'Pemohon' }
        ]);

        adminToken = jwt.sign({ id_user: 'U001', nama_role: 'Admin' }, secret);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    /**
     * ─── GET /api/users ───
     */
    describe('GET /api/users', () => {
        it('should return all users with 200 status', async () => {
            await User.create({
                id_user: 'USR001',
                nama: 'Admin User',
                email: 'admin@test.com',
                password: 'password123',
                id_role: 'R001',
                nip: '1111111111',
                no_hp: '0812345678',
                status_aktif: 'aktif'
            });

            await User.create({
                id_user: 'USR002',
                nama: 'Pemohon User',
                email: 'pemohon@test.com',
                password: 'password123',
                id_role: 'R008',
                nip: '2222222222',
                no_hp: '0812345679',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data.map(u => u.id_user)).toContain('USR001');
            expect(res.body.data.map(u => u.id_user)).toContain('USR002');
        });
    });

    /**
     * ─── POST /api/users ───
     */
    describe('POST /api/users', () => {
        const newUserPayload = {
            nama: 'Budi Utomo',
            email: 'budi@test.com',
            password: 'password123',
            role_id: 'R008',
            nip: '19901234567890',
            no_hp: '08123456789',
            status_aktif: 'aktif',
            instansi: 'Dinas Kominfo',
            alamat: 'Jl. Sudirman No. 1',
            jabatan: 'Staff IT'
        };

        it('should create a new user and return 201 status', async () => {
            // First user to seed U001 so generator starts correctly
            await User.create({
                id_user: 'U001',
                nama: 'Admin User',
                email: 'admin@test.com',
                password: 'password123',
                id_role: 'R001',
                nip: '1111111111',
                no_hp: '0812345678',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUserPayload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id_user).toBe('U002'); // Should auto-increment to U002
            expect(res.body.data.nama).toBe('Budi Utomo');

            // Verify in database
            const dbRecord = await User.findByPk('U002');
            expect(dbRecord).not.toBeNull();
            expect(dbRecord.email).toBe('budi@test.com');
        });

        it('should return 400 if email is already registered', async () => {
            await User.create({
                id_user: 'U001',
                nama: 'Budi Lama',
                email: 'budi@test.com',
                password: 'password123',
                id_role: 'R008',
                nip: '1111111111',
                no_hp: '0812345678',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUserPayload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Email sudah terdaftar');
        });

        it('should return 400 if NIP is already registered', async () => {
            await User.create({
                id_user: 'U001',
                nama: 'Budi Lama',
                email: 'budilama@test.com',
                password: 'password123',
                id_role: 'R008',
                nip: '19901234567890',
                no_hp: '0812345678',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUserPayload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('NIP sudah terdaftar');
        });
    });

    /**
     * ─── PUT /api/users/:id ───
     */
    describe('PUT /api/users/:id', () => {
        const updatePayload = {
            nama: 'Budi Updated',
            email: 'budi_up@test.com',
            role_id: 'R008',
            nip: '19901234567899',
            no_hp: '08123456780',
            status_aktif: 'aktif',
            instansi: 'Dinas Kominfo',
            alamat: 'Jl. Sudirman No. 2',
            jabatan: 'Staff IT Senior'
        };

        it('should update user and return 200 status', async () => {
            await User.create({
                id_user: 'U002',
                nama: 'Budi Utomo',
                email: 'budi@test.com',
                password: 'password123',
                id_role: 'R008',
                nip: '19901234567890',
                no_hp: '08123456789',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .put('/api/users/U002')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatePayload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('User berhasil diupdate');

            // Verify in DB
            const dbRecord = await User.findByPk('U002');
            expect(dbRecord.nama).toBe('Budi Updated');
            expect(dbRecord.email).toBe('budi_up@test.com');
        });

        it('should return 404 if user not found', async () => {
            const res = await request(app)
                .put('/api/users/U999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatePayload);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('User tidak ditemukan');
        });
    });

    /**
     * ─── POST /api/users/delete ───
     */
    describe('POST /api/users/delete', () => {
        it('should delete user with 200 status', async () => {
            await User.create({
                id_user: 'U002',
                nama: 'Budi Utomo',
                email: 'budi@test.com',
                password: 'password123',
                id_role: 'R008',
                nip: '19901234567890',
                no_hp: '08123456789',
                status_aktif: 'aktif'
            });

            const res = await request(app)
                .post('/api/users/delete')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id_user: 'U002' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('User berhasil dihapus');

            // Verify DB is empty
            const dbRecord = await User.findByPk('U002');
            expect(dbRecord).toBeNull();
        });

        it('should return 404 if user does not exist on delete', async () => {
            const res = await request(app)
                .post('/api/users/delete')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id_user: 'U999' });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('User tidak ditemukan');
        });
    });

    /**
     * ─── GET /api/users/roles ───
     */
    describe('GET /api/users/roles', () => {
        it('should return all roles with 200 status', async () => {
            const res = await request(app)
                .get('/api/users/roles')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
        });
    });
});
