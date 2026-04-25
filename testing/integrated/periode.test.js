const periodeController = require('../../controllers/periodeController');
const { Periode } = require('../../models');

// Explicitly mock static methods of the model
Periode.findAll = jest.fn();
Periode.create = jest.fn();
Periode.findByPk = jest.fn();

describe('PeriodeController Integration Test', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('getAllPeriode', () => {
        it('should return all periods with 200 status', async () => {
            const mockPeriodes = [
                { id_periode: 'PD001', nama_periode: 'Periode 1' },
                { id_periode: 'PD002', nama_periode: 'Periode 2' }
            ];
            
            // Mock the model method
            Periode.findAll.mockResolvedValue(mockPeriodes);

            await periodeController.getAllPeriode(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockPeriodes
            }));
        });

        it('should return 500 status on error', async () => {
            Periode.findAll.mockRejectedValue(new Error('Database Error'));

            await periodeController.getAllPeriode(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Database Error'
            }));
        });
    });

    describe('createPeriode', () => {
        it('should create a new period and return 201 status', async () => {
            mockReq.body = {
                nama_periode: 'Periode 2025',
                tanggal_mulai: '2025-01-01',
                tanggal_selesai: '2025-12-31',
                keterangan: 'Test',
                status_periode: 'aktif'
            };

            // Mock existing periods to calculate next ID
            Periode.findAll.mockResolvedValue([{ id_periode: 'PD001' }]);
            
            const mockNewPeriode = { id_periode: 'PD002', ...mockReq.body };
            Periode.create.mockResolvedValue(mockNewPeriode);

            await periodeController.createPeriode(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Periode berhasil ditambahkan',
                data: mockNewPeriode
            }));
        });

        it('should return 400 if start date is after end date', async () => {
            mockReq.body = {
                nama_periode: 'Invalid',
                tanggal_mulai: '2025-12-31',
                tanggal_selesai: '2025-01-01'
            };

            await periodeController.createPeriode(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Tanggal mulai tidak boleh lebih lama dari tanggal selesai'
            }));
        });
    });
});
