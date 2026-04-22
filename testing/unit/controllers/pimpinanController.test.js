const { Pimpinan, PeriodeJabatan, PimpinanAjudan, JabatanPimpinan, Periode, Sequelize } = require('../../../models');
const emailHelper = require('../../../helpers/emailHelper');
const PimpinanController = require('../../../controllers/pimpinanController');

jest.mock('../../../models', () => {
    return {
        Pimpinan: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByPk: jest.fn(),
            create: jest.fn(),
        },
        PeriodeJabatan: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
        },
        PimpinanAjudan: {
            update: jest.fn(),
        },
        JabatanPimpinan: {
            findAll: jest.fn(),
        },
        Periode: {
            findAll: jest.fn(),
        },
        Sequelize: {
            Op: {
                col: jest.fn((val) => val)
            }
        }
    };
});

jest.mock('../../../helpers/emailHelper', () => ({
    sendSyncInvitation: jest.fn(),
}));

jest.mock('../../../helpers/googleCalendarHelper', () => ({}));

describe('PimpinanController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {},
            body: {},
            user: { id_user: 'USR001', nama_role: 'Admin' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    describe('1. generateId()', () => {
        test('1. Return P001 jika tidak ada data', async () => {
            Pimpinan.findAll.mockResolvedValue([]);
            const id = await PimpinanController.generateId();
            expect(id).toBe('P001');
        });

        test('2. Increment benar: P001 -> P002', async () => {
            Pimpinan.findAll.mockResolvedValue([{ id_pimpinan: 'P001' }]);
            const id = await PimpinanController.generateId();
            expect(id).toBe('P002');
        });

        test('3. Menghandle format ID invalid (diabaikan)', async () => {
            Pimpinan.findAll.mockResolvedValue([{ id_pimpinan: 'INVALID' }, { id_pimpinan: 'P005' }]);
            const id = await PimpinanController.generateId();
            expect(id).toBe('P006');
        });

        test('4. Mengambil max valid dari campuran valid & invalid', async () => {
            Pimpinan.findAll.mockResolvedValue([
                { id_pimpinan: 'P002' },
                { id_pimpinan: 'P010' },
                { id_pimpinan: 'X999' }
            ]);
            const id = await PimpinanController.generateId();
            expect(id).toBe('P011');
        });
    });

    describe('2. getAllPimpinan()', () => {
        test('1. Sukses mengambil data pimpinan (200)', async () => {
            const mockPeriodes = [{ id_periode: 1, nama_periode: '2020-2025', status_periode: 'aktif' }];
            const mockData = [{ id_periode_jabatan: 1, pimpinan: {}, status_aktif: 'aktif' }];
            PeriodeJabatan.findAll.mockResolvedValue(mockData);

            await PimpinanController.getAllPimpinan(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockData
            }));
        });

        test('2. Return 500 jika database error', async () => {
            PeriodeJabatan.findAll.mockRejectedValue(new Error('db error'));
            await PimpinanController.getAllPimpinan(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('3. createOrUpdatePimpinan()', () => {
        const BODY = {
            nama_pimpinan: 'Budi',
            nip: '12345',
            email: 'budi@test.com',
            no_hp: '081',
            id_periode: 'PER001',
            id_jabatan: 'JAB001',
            status_aktif: 'aktif'
        };

        describe('🔹 Validation Checks', () => {
            test('1. Return 400 jika NIP sudah terdaftar oleh pimpinan lain', async () => {
                req.body = { ...BODY, nip: '12345' };
                // Mock findOne to return a DIFFERENT pimpinan
                Pimpinan.findOne.mockResolvedValue({ id_pimpinan: 'P002', nip: '12345' });
                
                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                    success: false,
                    message: 'NIP pimpinan sudah terdaftar' 
                }));
            });

            test('2. Return 400 jika Email sudah terdaftar oleh pimpinan lain', async () => {
                req.body = { ...BODY, email: 'budi@test.com' };
                // Mock findOne: first call for NIP (none), second for Email (exists)
                Pimpinan.findOne
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({ id_pimpinan: 'P002', email: 'budi@test.com' });
                
                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                    success: false,
                    message: 'Email pimpinan sudah terdaftar' 
                }));
            });

            test('3. Return 400 jika jabatan sudah terisi oleh pimpinan lain', async () => {
                req.body = BODY;
                // No Pimpinan conflict
                Pimpinan.findOne.mockResolvedValue(null);
                Pimpinan.findAll.mockResolvedValue([]); // for generateId
                Pimpinan.create.mockResolvedValue({ id_pimpinan: 'P001' });
                
                // Position already occupied by P002
                PeriodeJabatan.findOne.mockResolvedValue({ id_pimpinan: 'P002' });
                
                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                    success: false,
                    message: 'Jabatan ini sudah terisi oleh pimpinan lain pada periode tersebut' 
                }));
            });
        });

        describe('🔹 Create Flow', () => {
            test('1. Pimpinan baru & Assignment baru -> create keduanya', async () => {
                req.body = BODY;
                Pimpinan.findOne.mockResolvedValue(null);
                Pimpinan.findAll.mockResolvedValue([]); // for generateId
                Pimpinan.create.mockResolvedValue({ id_pimpinan: 'P001' });
                PeriodeJabatan.findOne.mockResolvedValue(null);
                PeriodeJabatan.create.mockResolvedValue({});

                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(Pimpinan.create).toHaveBeenCalledWith(expect.objectContaining({ nip: '12345' }));
                expect(PeriodeJabatan.create).toHaveBeenCalledWith(expect.objectContaining({ id_pimpinan: 'P001' }));
                expect(res.status).toHaveBeenCalledWith(200);
            });

            test('2. Kirim email undangan jika email disediakan', async () => {
                req.body = BODY;
                Pimpinan.findOne.mockResolvedValue(null);
                Pimpinan.findAll.mockResolvedValue([]);
                Pimpinan.create.mockResolvedValue({ id_pimpinan: 'P001', email: 'budi@test.com' });
                PeriodeJabatan.findOne.mockResolvedValue(null);

                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(emailHelper.sendSyncInvitation).toHaveBeenCalled();
            });

            test('3. Tetap sukses meskipun kirim email gagal (edge case)', async () => {
                req.body = { ...BODY, id_pimpinan: 'P001' };
                const mockPimpinan = { id_pimpinan: 'P001', update: jest.fn().mockResolvedValue({}) };
                const mockAssignment = { id_pimpinan: 'P001', update: jest.fn().mockResolvedValue({}) };
                
                Pimpinan.findOne.mockResolvedValue(null);
                Pimpinan.findByPk.mockResolvedValue(mockPimpinan);
                PeriodeJabatan.findOne.mockResolvedValue(mockAssignment);
                emailHelper.sendSyncInvitation.mockRejectedValue(new Error('mail error'));

                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(res.status).toHaveBeenCalledWith(200);
            });
        });

        describe('🔹 Update Flow', () => {
            test('1. Pimpinan ada & Assignment ada -> update keduanya', async () => {
                req.body = { ...BODY, id_pimpinan: 'P001' };
                const mockPimpinan = { id_pimpinan: 'P001', update: jest.fn().mockResolvedValue({}) };
                const mockAssignment = { id_pimpinan: 'P001', update: jest.fn().mockResolvedValue({}) };
                
                // Mock uniqueness check: no other records with same NIP/Email
                Pimpinan.findOne.mockResolvedValue(null);
                Pimpinan.findByPk.mockResolvedValue(mockPimpinan);
                PeriodeJabatan.findOne.mockResolvedValue(mockAssignment);

                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(mockPimpinan.update).toHaveBeenCalledWith(expect.objectContaining({ nama_pimpinan: 'Budi' }));
                expect(mockAssignment.update).toHaveBeenCalledWith(expect.objectContaining({ id_pimpinan: 'P001' }));
                expect(res.status).toHaveBeenCalledWith(200);
            });
        });

        describe('🔹 Cascading Deactivation', () => {
            test('1. Menonaktifkan pimpinan -> menonaktifkan ajudan pada periode tersebut', async () => {
                req.body = { ...BODY, status_aktif: 'nonaktif', id_pimpinan: 'P001' };
                const mockPimpinan = { id_pimpinan: 'P001', update: jest.fn().mockResolvedValue({}) };
                const mockAssignment = { id_pimpinan: 'P001', update: jest.fn().mockResolvedValue({}) };
                
                // No uniqueness conflict
                Pimpinan.findOne.mockResolvedValue(null);
                Pimpinan.findByPk.mockResolvedValue(mockPimpinan);
                PeriodeJabatan.findOne.mockResolvedValue(mockAssignment);
                PimpinanAjudan.update.mockResolvedValue([1]);

                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(PimpinanAjudan.update).toHaveBeenCalledWith(
                    { status_aktif: 'nonaktif' },
                    expect.objectContaining({
                        where: expect.objectContaining({
                            id_jabatan: BODY.id_jabatan,
                            id_periode: BODY.id_periode
                        })
                    })
                );
                expect(res.status).toHaveBeenCalledWith(200);
            });
        });

        describe('🔹 Edge Cases & Error', () => {
            test('1. Tanpa email -> tidak memanggil emailHelper', async () => {
                req.body = { ...BODY, email: '' }; // empty email string
                Pimpinan.findOne.mockResolvedValue({ id_pimpinan: 'P001' });
                PeriodeJabatan.findOne.mockResolvedValue({});

                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(emailHelper.sendSyncInvitation).not.toHaveBeenCalled();
            });

            test('2. Default status_aktif ke "aktif" jika tidak disediakan', async () => {
                req.body = { ...BODY, status_aktif: '', id_pimpinan: 'P001' };
                const mockPimpinan = { id_pimpinan: 'P001', update: jest.fn().mockResolvedValue({}) };
                
                // Mock uniqueness checks to return null (no conflict with OTHER records)
                Pimpinan.findOne.mockResolvedValue(null);
                Pimpinan.findByPk.mockResolvedValue(mockPimpinan);
                PeriodeJabatan.findOne.mockResolvedValue(null);
                PeriodeJabatan.create.mockResolvedValue({});

                await PimpinanController.createOrUpdatePimpinan(req, res);

                expect(PeriodeJabatan.create).toHaveBeenCalledWith(expect.objectContaining({ status_aktif: 'aktif' }));
                expect(res.status).toHaveBeenCalledWith(200);
            });

            test('3. Return 500 jika Pimpinan.findOne error', async () => {
                req.body = BODY;
                Pimpinan.findOne.mockRejectedValue(new Error('db error'));
                await PimpinanController.createOrUpdatePimpinan(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('4. getAllJabatan()', () => {
        test('1. Sukses mengambil data jabatan', async () => {
            JabatanPimpinan.findAll.mockResolvedValue([{ nama_jabatan: 'Walikota' }]);
            await PimpinanController.getAllJabatan(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('2. Return 500 jika database error', async () => {
            JabatanPimpinan.findAll.mockRejectedValue(new Error());
            await PimpinanController.getAllJabatan(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('5. getAllPimpinanData()', () => {
        test('1. Sukses mengambil list pimpinan urutan ASC', async () => {
            Pimpinan.findAll.mockResolvedValue([]);
            await PimpinanController.getAllPimpinanData(req, res);
            expect(Pimpinan.findAll).toHaveBeenCalledWith(expect.objectContaining({ order: [['nama_pimpinan', 'ASC']] }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Return 500 jika database error', async () => {
            Pimpinan.findAll.mockRejectedValue(new Error());
            await PimpinanController.getAllPimpinanData(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('6. getActiveAssignments()', () => {
        test('1. Untuk Non-Ajudan: Tanpa include PimpinanAjudan', async () => {
            req.user = { nama_role: 'Admin', id_user: 'USR1' };
            PeriodeJabatan.findAll.mockResolvedValue([]);

            await PimpinanController.getActiveAssignments(req, res);

            const callArgs = PeriodeJabatan.findAll.mock.calls[0][0];
            const includes = callArgs.include.map(inc => inc.model);
            expect(includes).not.toContain(PimpinanAjudan);
            expect(callArgs.where).toEqual({ status_aktif: 'aktif' });
        });

        test('2. Untuk Ajudan: Include PimpinanAjudan dengan filter id_user', async () => {
            req.user = { nama_role: 'Ajudan', id_user: 'AJU007' };
            PeriodeJabatan.findAll.mockResolvedValue([]);

            await PimpinanController.getActiveAssignments(req, res);

            const callArgs = PeriodeJabatan.findAll.mock.calls[0][0];
            const ajudanInclude = callArgs.include.find(inc => inc.model === PimpinanAjudan);
            expect(ajudanInclude).toBeDefined();
            expect(ajudanInclude.where).toEqual(expect.objectContaining({ id_user_ajudan: 'AJU007' }));
        });

        test('3. Return 500 jika database error', async () => {
            PeriodeJabatan.findAll.mockRejectedValue(new Error());
            await PimpinanController.getActiveAssignments(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    describe('7. resendSyncInvitation()', () => {
        test('1. Return 404 jika pimpinan tidak ditemukan', async () => {
            req.params.id_pimpinan = 'P999';
            Pimpinan.findByPk.mockResolvedValue(null);
            await PimpinanController.resendSyncInvitation(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('2. Return 404 jika pimpinan tidak memiliki email', async () => {
            req.params.id_pimpinan = 'P001';
            Pimpinan.findByPk.mockResolvedValue({ id_pimpinan: 'P001', email: null });
            await PimpinanController.resendSyncInvitation(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('3. Sukses kirim ulang email (200)', async () => {
            req.params.id_pimpinan = 'P001';
            Pimpinan.findByPk.mockResolvedValue({ id_pimpinan: 'P001', email: 'test@mail.com' });
            
            await PimpinanController.resendSyncInvitation(req, res);

            expect(emailHelper.sendSyncInvitation).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('4. Return 500 jika gagal saat kirim email', async () => {
            req.params.id_pimpinan = 'P001';
            Pimpinan.findByPk.mockResolvedValue({ id_pimpinan: 'P001', email: 'test@mail.com' });
            emailHelper.sendSyncInvitation.mockRejectedValue(new Error('fail'));
            
            await PimpinanController.resendSyncInvitation(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
