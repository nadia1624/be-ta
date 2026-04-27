const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { Periode } = require('../../models');

// Mocking model Sequelize secara selektif agar tidak merusak controller lain
jest.mock('../../models', () => {
    const actualModels = jest.requireActual('../../models');
    return {
        ...actualModels,
        Periode: {
            findAll: jest.fn(),
            create: jest.fn(),
            findByPk: jest.fn(),
        }
    };
});

// Mocking helper scheduler agar tidak mengganggu test
jest.mock('../../helpers/reminderScheduler', () => ({
    initReminders: jest.fn()
}));

describe('Periode API Integration Test', () => {
    let adminToken;
    let userToken;
    const secret = process.env.JWT_SECRET || 'secret';

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup token untuk role berbeda
        adminToken = jwt.sign({ id_user: 'USR001', nama_role: 'Admin' }, secret);
        userToken = jwt.sign({ id_user: 'USR002', nama_role: 'Staff' }, secret);
    });

    /**
     * ─── GET /api/periode ───
     */
    describe('GET /api/periode', () => {
        it('should return all periods with 200 status (Success)', async () => {
            const mockData = [
                { id_periode: 'PD001', nama_periode: 'Periode 1', toJSON: () => ({ id_periode: 'PD001', nama_periode: 'Periode 1' }) },
                { id_periode: 'PD002', nama_periode: 'Periode 2', toJSON: () => ({ id_periode: 'PD002', nama_periode: 'Periode 2' }) }
            ];
            Periode.findAll.mockResolvedValue(mockData);

            const res = await request(app)
                .get('/api/periode')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
        });

        it('should return 500 if database fails (Server Error)', async () => {
            Periode.findAll.mockRejectedValue(new Error('Database Down'));

            const res = await request(app)
                .get('/api/periode')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Database Down');
        });

        it('should return 401 if no token provided (Unauthorized)', async () => {
            const res = await request(app).get('/api/periode');
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    /**
     * ─── POST /api/periode ───
     */
    describe('POST /api/periode', () => {
        const newPeriodeData = {
            nama_periode: 'Periode 2026',
            tanggal_mulai: '2026-01-01',
            tanggal_selesai: '2026-12-31',
            keterangan: 'Rencana 2026',
            status_periode: 'aktif'
        };

        it('should create a new period and return 201 (Success)', async () => {
            Periode.findAll.mockResolvedValue([]); // Untuk kalkulasi ID otomatis
            Periode.create.mockResolvedValue({ id_periode: 'PD001', ...newPeriodeData });

            const res = await request(app)
                .post('/api/periode')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newPeriodeData);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id_periode).toBe('PD001');
        });

        it('should return 400 if start date > end date (Validation Error)', async () => {
            const invalidData = { ...newPeriodeData, tanggal_mulai: '2026-12-31', tanggal_selesai: '2026-01-01' };

            const res = await request(app)
                .post('/api/periode')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('tidak boleh lebih lama');
        });

        it('should return 403 if user is not Admin (Forbidden)', async () => {
            const res = await request(app)
                .post('/api/periode')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newPeriodeData);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('tidak memiliki akses');
        });
    });

    /**
     * ─── PUT /api/periode/:id ───
     */
    describe('PUT /api/periode/:id', () => {
        const updateData = { nama_periode: 'Updated Periode' };

        it('should update period and return 200 (Success)', async () => {
            const mockInstance = {
                id_periode: 'PD001',
                update: jest.fn().mockResolvedValue(true)
            };
            Periode.findByPk.mockResolvedValue(mockInstance);

            const res = await request(app)
                .put('/api/periode/PD001')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockInstance.update).toHaveBeenCalled();
        });

        it('should return 404 if period not found (Not Found)', async () => {
            Periode.findByPk.mockResolvedValue(null);

            const res = await request(app)
                .put('/api/periode/PD999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData);

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('tidak ditemukan');
        });

        it('should return 500 on update error (Server Error)', async () => {
            Periode.findByPk.mockRejectedValue(new Error('Update failed'));

            const res = await request(app)
                .put('/api/periode/PD001')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData);

            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Update failed');
        });
    });
});
