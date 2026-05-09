const { PimpinanAjudan, User, PeriodeJabatan, Pimpinan, JabatanPimpinan, Periode, Sequelize, sequelize } = require('../../../models');
const PenugasanAjudanController = require('../../../controllers/PenugasanAjudanController');

jest.mock('../../../models', () => {
    const tx = {
        commit: jest.fn(() => Promise.resolve()),
        rollback: jest.fn(() => Promise.resolve()),
    };
    return {
        PimpinanAjudan: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            destroy: jest.fn(),
        },
        User: {},
        PeriodeJabatan: {},
        Pimpinan: {},
        JabatanPimpinan: {},
        Periode: {},
        Sequelize: {
            Op: {
                col: jest.fn((val) => val)
            }
        },
        sequelize: {
            transaction: jest.fn(() => Promise.resolve(tx)),
            _tx: tx
        }
    };
});

describe('PenugasanAjudanController Unit Tests', () => {
    let req, res;
    const mockTx = sequelize._tx;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { id_user: 'USR001' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
        sequelize.transaction.mockResolvedValue(mockTx);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('1. getAllAssignments()', () => {
        it('should return 200 and all assignments on success', async () => {
            const mockData = [{ id_pimpinan_ajudan: 1 }];
            PimpinanAjudan.findAll.mockResolvedValue(mockData);

            await PenugasanAjudanController.getAllAssignments(req, res);

            expect(PimpinanAjudan.findAll).toHaveBeenCalledWith(expect.objectContaining({
                include: expect.any(Array),
                order: [['createdAt', 'DESC']]
            }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockData
            }));
        });

        it('should return 500 if database error occurs', async () => {
            PimpinanAjudan.findAll.mockRejectedValue(new Error('DB Error'));

            await PenugasanAjudanController.getAllAssignments(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('2. createAssignment()', () => {
        const BODY = {
            id_user_ajudan: 'AJU001',
            id_jabatan: 'JAB001',
            id_periode: 'PER001',
            keterangan: 'Test Note'
        };

        describe('🔹 Validation Flow', () => {
            it('should return 400 and rollback if assignment already exists for the same user and period', async () => {
                req.body = BODY;
                PimpinanAjudan.findOne.mockResolvedValue({ id_pimpinan_ajudan: 1 });

                await PenugasanAjudanController.createAssignment(req, res);

                expect(mockTx.rollback).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    success: false,
                    message: 'Ajudan ini sudah memiliki penugasan di periode yang sama'
                }));
            });
        });

        describe('🔹 First Assignment Flow', () => {
            it('should set status_aktif to "aktif" and return 201 when it is the first assignment (count=0)', async () => {
                req.body = BODY;
                PimpinanAjudan.findOne.mockResolvedValue(null);
                PimpinanAjudan.count.mockResolvedValue(0);
                PimpinanAjudan.create.mockResolvedValue({ ...BODY, status_aktif: 'aktif' });

                await PenugasanAjudanController.createAssignment(req, res);

                expect(PimpinanAjudan.create).toHaveBeenCalledWith(
                    expect.objectContaining({ status_aktif: 'aktif' }),
                    expect.objectContaining({ transaction: mockTx })
                );
                expect(mockTx.commit).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
            });
        });

        describe('🔹 Non-First Assignment Flow', () => {
            it('should set status_aktif to "nonaktif" when it is NOT the first assignment (count>0)', async () => {
                req.body = BODY;
                PimpinanAjudan.findOne.mockResolvedValue(null);
                PimpinanAjudan.count.mockResolvedValue(5);
                PimpinanAjudan.create.mockResolvedValue({ ...BODY, status_aktif: 'nonaktif' });

                await PenugasanAjudanController.createAssignment(req, res);

                expect(PimpinanAjudan.create).toHaveBeenCalledWith(
                    expect.objectContaining({ status_aktif: 'nonaktif' }),
                    expect.anything()
                );
                expect(mockTx.commit).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
            });
        });

        describe('🔹 Default Value Flow', () => {
            it('should use default keterangan if not provided in request body', async () => {
                req.body = { ...BODY, keterangan: undefined };
                PimpinanAjudan.findOne.mockResolvedValue(null);
                PimpinanAjudan.count.mockResolvedValue(0);
                PimpinanAjudan.create.mockResolvedValue({});

                await PenugasanAjudanController.createAssignment(req, res);

                expect(PimpinanAjudan.create).toHaveBeenCalledWith(
                    expect.objectContaining({ keterangan: 'Penugasan Ajudan' }),
                    expect.anything()
                );
            });
        });

        describe('🔹 Error Cases', () => {
            it('should return 500 and rollback if findOne error occurs', async () => {
                req.body = BODY;
                PimpinanAjudan.findOne.mockRejectedValue(new Error('Error'));

                await PenugasanAjudanController.createAssignment(req, res);

                expect(mockTx.rollback).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(500);
            });

            it('should return 500 and rollback if count error occurs', async () => {
                req.body = BODY;
                PimpinanAjudan.findOne.mockResolvedValue(null);
                PimpinanAjudan.count.mockRejectedValue(new Error('Error'));

                await PenugasanAjudanController.createAssignment(req, res);

                expect(mockTx.rollback).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(500);
            });

            it('should return 500 and rollback if create error occurs', async () => {
                req.body = BODY;
                PimpinanAjudan.findOne.mockResolvedValue(null);
                PimpinanAjudan.count.mockResolvedValue(0);
                PimpinanAjudan.create.mockRejectedValue(new Error('Error'));

                await PenugasanAjudanController.createAssignment(req, res);

                expect(mockTx.rollback).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(500);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('3. setActiveAssignment()', () => {
        const BODY = {
            id_user_ajudan: 'AJU001',
            id_jabatan: 'JAB001',
            id_periode: 'PER001'
        };

        it('should successfully deactivate all and activate selected assignment (return 200)', async () => {
            req.body = BODY;
            // First update: deactivate all
            PimpinanAjudan.update.mockResolvedValueOnce([5]);
            // Second update: activate selected
            PimpinanAjudan.update.mockResolvedValueOnce([1]);

            await PenugasanAjudanController.setActiveAssignment(req, res);

            expect(PimpinanAjudan.update).toHaveBeenCalledWith(
                { status_aktif: 'nonaktif' },
                expect.objectContaining({ where: { id_user_ajudan: BODY.id_user_ajudan } })
            );
            expect(PimpinanAjudan.update).toHaveBeenCalledWith(
                { status_aktif: 'aktif' },
                expect.objectContaining({ where: expect.objectContaining({ id_periode: BODY.id_periode }) })
            );
            expect(mockTx.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 and rollback if selected assignment is not found during activation', async () => {
            req.body = BODY;
            PimpinanAjudan.update.mockResolvedValueOnce([5]); // Deactivate success
            PimpinanAjudan.update.mockResolvedValueOnce([0]); // Activate failed (not found)

            await PenugasanAjudanController.setActiveAssignment(req, res);

            expect(mockTx.rollback).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 and rollback if update error occurs', async () => {
            req.body = BODY;
            PimpinanAjudan.update.mockRejectedValue(new Error('DB Error'));

            await PenugasanAjudanController.setActiveAssignment(req, res);

            expect(mockTx.rollback).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('4. deleteAssignment()', () => {
        const BODY = {
            id_user_ajudan: 'AJU001',
            id_jabatan: 'JAB001',
            id_periode: 'PER001'
        };

        it('should return 400 if required parameters are missing', async () => {
            req.body = { id_user_ajudan: 'AJU001' }; // missing jabatan and periode

            await PenugasanAjudanController.deleteAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'ID User, Jabatan, and Periode are required'
            }));
        });

        it('should return 200 if assignment is successfully deleted (destroy > 0)', async () => {
            req.body = BODY;
            PimpinanAjudan.destroy.mockResolvedValue(1);

            await PenugasanAjudanController.deleteAssignment(req, res);

            expect(PimpinanAjudan.destroy).toHaveBeenCalledWith(expect.objectContaining({
                where: BODY
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if assignment to delete is not found (destroy = 0)', async () => {
            req.body = BODY;
            PimpinanAjudan.destroy.mockResolvedValue(0);

            await PenugasanAjudanController.deleteAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 if destroy throws an error', async () => {
            req.body = BODY;
            PimpinanAjudan.destroy.mockRejectedValue(new Error('Error'));

            await PenugasanAjudanController.deleteAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
