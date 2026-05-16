const {
    Agenda, StatusAgenda, AgendaPimpinan, SlotAgendaPimpinan,
    PeriodeJabatan, SlotAgendaStaff, JabatanPimpinan, Pimpinan,
    SlotWaktu, User, PimpinanAjudan, Penugasan, LaporanKegiatan,
    Role, KASKPDPendamping, KASKPD, sequelize
} = require('../../../models');
const googleCalendarHelper = require('../../../helpers/googleCalendarHelper');
const { sendPushNotification } = require('../../../helpers/pushNotificationHelper');
const AgendaController = require('../../../controllers/agendaController');
const { Op } = require('sequelize');


jest.mock('../../../models', () => {
    const tx = {
        commit: jest.fn(() => Promise.resolve()),
        rollback: jest.fn(() => Promise.resolve()),
        LOCK: { UPDATE: 'UPDATE' }
    };
    return {
        Agenda: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn(),
            findByPk: jest.fn(),
        },
        StatusAgenda: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
        },
        AgendaPimpinan: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
        SlotAgendaPimpinan: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn(),
            count: jest.fn(),
            bulkCreate: jest.fn(),
        },
        PeriodeJabatan: {
            findOne: jest.fn(),
        },
        SlotAgendaStaff: {
            destroy: jest.fn(),
        },
        JabatanPimpinan: {},
        Pimpinan: {
            findByPk: jest.fn(),
        },
        SlotWaktu: {
            findAll: jest.fn(),
        },
        User: {
            findAll: jest.fn(),
        },
        PimpinanAjudan: {
            findAll: jest.fn(),
            findOne: jest.fn(),
        },
        Penugasan: {
            findAll: jest.fn(),
            destroy: jest.fn(),
        },
        LaporanKegiatan: {},
        Role: {},
        KASKPDPendamping: {
            create: jest.fn(),
            destroy: jest.fn(),
        },
        KASKPD: {},
        sequelize: {
            transaction: jest.fn(() => Promise.resolve(tx)),
            _tx: tx
        },
        Op: {
            like: Symbol('like'),
            desc: Symbol('desc'),
            col: jest.fn((v) => v),
            ne: Symbol('ne'),
            lt: Symbol('lt'),
            gt: Symbol('gt'),
            in: Symbol('in'),
            or: Symbol('or'),
            between: Symbol('between'),
            gte: Symbol('gte')
        }
    };
});

jest.mock('../../../helpers/googleCalendarHelper', () => ({
    syncEvent: jest.fn(),
    deleteEvent: jest.fn(),
}));

jest.mock('../../../helpers/pushNotificationHelper', () => ({
    sendPushNotification: jest.fn(),
}));

// ═══════════════════════════════════════════════════════════════════════════
// 2. HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const mockReq = (body = {}, user = {}, params = {}, file = null, query = {}) => ({
    body,
    user,
    params,
    file,
    query
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('AgendaController Unit Tests', () => {
    const mockTx = sequelize._tx;

    beforeEach(() => {
        jest.clearAllMocks();
        sequelize.transaction.mockImplementation(() => Promise.resolve(mockTx));
    });

    // 1. generateAgendaId()
    describe('1. generateAgendaId()', () => {
        test('1. Return AG001 jika tidak ada data', async () => {
            Agenda.findOne.mockResolvedValue(null);
            const id = await AgendaController.generateAgendaId();
            expect(id).toBe('AG001');
        });

        test('2. Return AG002 jika ada AG001', async () => {
            Agenda.findOne.mockResolvedValue({ id_agenda: 'AG001' });
            const id = await AgendaController.generateAgendaId();
            expect(id).toBe('AG002');
        });

        test('3. Ignore jika format tidak valid (tetap fallback)', async () => {
            Agenda.findOne.mockResolvedValue({ id_agenda: 'INVALID' });
            const id = await AgendaController.generateAgendaId();
            expect(id).toBe('AG001');
        });
    });

    // 2. generateStatusAgendaId()
    describe('2. generateStatusAgendaId()', () => {
        test('1. Return SA001 jika tidak ada data', async () => {
            StatusAgenda.findOne.mockResolvedValue(null);
            const id = await AgendaController.generateStatusAgendaId();
            expect(id).toBe('SA001');
        });

        test('2. Return SA002 jika ada SA001', async () => {
            StatusAgenda.findOne.mockResolvedValue({ id_status_agenda: 'SA001' });
            const id = await AgendaController.generateStatusAgendaId();
            expect(id).toBe('SA002');
        });
    });

    // 3. createAgenda()
    describe('3. createAgenda()', () => {
        const VALID_BODY = {
            nomor_surat: 'S-001',
            perihal: 'Rapat Koordinasi',
            nama_kegiatan: 'Rapat Strategis',
            tanggal_kegiatan: '2099-01-01',
            waktu_mulai: '08:00',
            waktu_selesai: '10:00',
            invited_pimpinan: '[{"id_jabatan":"J1", "id_periode":"P1"}]'
        };

        const USER = { id_user: 'USR1', nama: 'Polan', nama_role: 'Pemohon' };
        const FILE = { path: 'uploads/surat.pdf', size: 1024 * 1024 }; // 1MB

        describe('3.1 Validation Tests', () => {
            test('1. Return 400 jika nomor_surat kosong', async () => {
                const req = mockReq({ ...VALID_BODY, nomor_surat: '' }, USER, {}, FILE);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('2. Return 400 jika perihal kosong', async () => {
                const req = mockReq({ ...VALID_BODY, perihal: '' }, USER, {}, FILE);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('3. Return 400 jika nama_kegiatan kosong', async () => {
                const req = mockReq({ ...VALID_BODY, nama_kegiatan: '' }, USER, {}, FILE);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('4. Return 400 jika file tidak ada', async () => {
                const req = mockReq(VALID_BODY, USER, {}, null);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Surat permohonan wajib diupload' }));
            });

            test('5. Return 400 jika file > 5MB', async () => {
                const bigFile = { ...FILE, size: 6 * 1024 * 1024 };
                const req = mockReq(VALID_BODY, USER, {}, bigFile);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('6. Return 400 jika tanggal_kegiatan sudah lewat', async () => {
                const req = mockReq({ ...VALID_BODY, tanggal_kegiatan: '2000-01-01' }, USER, {}, FILE);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('7. Return 400 jika waktu_selesai <= waktu_mulai', async () => {
                const req = mockReq({ ...VALID_BODY, waktu_mulai: '10:00', waktu_selesai: '09:00' }, USER, {}, FILE);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('8. Return 400 jika nomor_surat sudah digunakan oleh permohonan lain pemohon', async () => {
                Agenda.findOne.mockResolvedValue({ id_agenda: 'AG999' });
                const req = mockReq(VALID_BODY, USER, {}, FILE);
                const res = mockRes();
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('sudah pernah Anda gunakan') }));
            });
        });

        describe('3.2 Success Test', () => {
            test('1. Return 201 jika semua valid', async () => {
                const req = mockReq(VALID_BODY, USER, {}, FILE);
                const res = mockRes();

                Agenda.findOne.mockResolvedValue(null);
                StatusAgenda.findOne.mockResolvedValue(null);
                Agenda.create.mockResolvedValue({ id_agenda: 'AG001', nama_kegiatan: 'Rapat' });
                StatusAgenda.create.mockResolvedValue({});
                User.findAll.mockResolvedValue([]);

                await AgendaController.createAgenda(req, res);

                expect(Agenda.create).toHaveBeenCalled();
                expect(StatusAgenda.create).toHaveBeenCalledWith(expect.objectContaining({ status_agenda: 'pending' }), expect.anything());
                expect(AgendaPimpinan.create).toHaveBeenCalled();
                expect(mockTx.commit).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
            });


        });

        describe('3.3 Edge Cases', () => {
            test('1.invited_pimpinan sudah berupa array (bukan string JSON)', async () => {
                const req = mockReq({ ...VALID_BODY, invited_pimpinan: [{ id_jabatan: 'J1', id_periode: 'P1' }] }, USER, {}, FILE);
                const res = mockRes();
                Agenda.create.mockResolvedValue({ id_agenda: 'AG1' });
                await AgendaController.createAgenda(req, res);
                expect(AgendaPimpinan.create).toHaveBeenCalled();
            });

            test('2. Role Sespri → status langsung approved_sespri', async () => {
                const sespriUser = { ...USER, nama_role: 'Sespri' };
                const req = mockReq(VALID_BODY, sespriUser, {}, FILE);
                const res = mockRes();
                Agenda.create.mockResolvedValue({ id_agenda: 'AG1' });
                await AgendaController.createAgenda(req, res);
                expect(StatusAgenda.create).toHaveBeenCalledWith(expect.objectContaining({ status_agenda: 'approved_sespri' }), expect.anything());
            });

            test('3. Notifikasi terkirim ke Sespri jika pemohon yang buat', async () => {
                const req = mockReq(VALID_BODY, USER, {}, FILE);
                const res = mockRes();
                Agenda.create.mockResolvedValue({ id_agenda: 'AG1' });
                User.findAll.mockResolvedValue([{ id_user: 'SESP1', role: { nama_role: 'Sespri' } }]);

                await AgendaController.createAgenda(req, res);

                expect(sendPushNotification).toHaveBeenCalledWith('SESP1', expect.anything());
            });

            test('4. Notifikasi terkirim ke Ajudan jika Sespri yang buat', async () => {
                const sespriUser = { ...USER, nama_role: 'Sespri' };
                const req = mockReq(VALID_BODY, sespriUser, {}, FILE);
                const res = mockRes();
                Agenda.create.mockResolvedValue({ id_agenda: 'AG1', nama_kegiatan: 'X' });
                PimpinanAjudan.findAll.mockResolvedValue([{ id_user_ajudan: 'AJU1' }]);

                await AgendaController.createAgenda(req, res);

                expect(sendPushNotification).toHaveBeenCalledWith('AJU1', expect.anything());
            });

            test('5. Return 500 jika create fail (try/catch)', async () => {
                const req = mockReq(VALID_BODY, USER, {}, FILE);
                const res = mockRes();
                Agenda.findOne.mockRejectedValue(new Error('fail'));
                await AgendaController.createAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(mockTx.rollback).toHaveBeenCalled();
            });
        });
    });

    // 4. getSlots()
    describe('4. getSlots()', () => {
        test('1. Return 200 jika sukses', async () => {
            SlotWaktu.findAll.mockResolvedValue([{ id: 1 }]);
            const res = mockRes();
            await AgendaController.getSlots({}, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
        test('2. Return 500 jika error', async () => {
            SlotWaktu.findAll.mockRejectedValue(new Error());
            const res = mockRes();
            await AgendaController.getSlots({}, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // 5. getMyAgendas()
    describe('5. getMyAgendas()', () => {
        test('1. Return 200 jika sukses', async () => {
            const req = mockReq({}, { id_user: 'U1' });
            const res = mockRes();
            Agenda.findAll.mockResolvedValue([]);
            await AgendaController.getMyAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
        test('2. Return 500 jika error', async () => {
            const req = mockReq({}, { id_user: 'U1' });
            const res = mockRes();
            Agenda.findAll.mockRejectedValue(new Error('Fetch My Agendas Fail'));
            await AgendaController.getMyAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // 6. getAllAgendas()
    describe('6. getAllAgendas()', () => {
        test('1. Return 200 jika sukses', async () => {
            const res = mockRes();
            Agenda.findAll.mockResolvedValue([]);
            await AgendaController.getAllAgendas({}, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
        test('2. Return 500 jika error', async () => {
            const res = mockRes();
            Agenda.findAll.mockRejectedValue(new Error());
            await AgendaController.getAllAgendas({}, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // 7. verifyAgenda()
    describe('7. verifyAgenda()', () => {
        const PARAMS = { id_agenda: 'AG001' };
        const USER = { id_user: 'SESP1', nama_role: 'Sespri' };
        
        describe('7.1 Validation', () => {
            test('1. Return 400 jika status tidak valid', async () => {
                const req = mockReq({ status: 'INVALID' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.verifyAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('2. Return 404 jika agenda tidak ditemukan', async () => {
                Agenda.findByPk.mockResolvedValue(null);
                const req = mockReq({ status: 'approved_sespri' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.verifyAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });
        });

        describe('7.2 Success', () => {
            test('1. StatusAgenda baru dibuat dan updatedAt diupdate', async () => {
                const agenda = { id_agenda: 'AG001', update: jest.fn(), id_user_pemohon: 'PEM1', nama_kegiatan: 'X' };
                Agenda.findByPk.mockResolvedValue(agenda);
                StatusAgenda.findOne.mockResolvedValue(null);
                
                const req = mockReq({ status: 'approved_sespri' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.verifyAgenda(req, res);

                expect(StatusAgenda.create).toHaveBeenCalledWith(expect.objectContaining({ status_agenda: 'approved_sespri' }), expect.anything());
                expect(agenda.update).toHaveBeenCalledWith({ updatedAt: expect.any(Date) }, expect.anything());
                expect(mockTx.commit).toHaveBeenCalled();
            });

            test('2. Notifikasi ke Ajudan jika approved_sespri', async () => {
                const agenda = { id_agenda: 'AG1', update: jest.fn(), id_user_pemohon: 'PEM1' };
                Agenda.findByPk.mockResolvedValue(agenda);
                AgendaPimpinan.findAll.mockResolvedValue([{ id_jabatan: 'J1', id_periode: 'P1' }]);
                PimpinanAjudan.findAll.mockResolvedValue([{ id_user_ajudan: 'AJU1' }]);

                const req = mockReq({ status: 'approved_sespri' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.verifyAgenda(req, res);

                expect(sendPushNotification).toHaveBeenCalledWith('AJU1', expect.anything());
            });
        });

        describe('7.3 Error path', () => {
            test('1. Return 500 jika findByPk fail', async () => {
                Agenda.findByPk.mockRejectedValue(new Error('fail'));
                const req = mockReq({ status: 'approved_sespri' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.verifyAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(500);
                expect(mockTx.rollback).toHaveBeenCalled();
            });
        });

        describe('7.4 Google Sync & Notifications', () => {
            test('1. DeleteEvent terpanggil jika rejected/canceled untuk pimpinan sinkron', async () => {
                const agenda = { id_agenda: 'AG001', update: jest.fn(), id_user_pemohon: 'PEM1' };
                Agenda.findByPk.mockResolvedValue(agenda);
                AgendaPimpinan.findAll.mockResolvedValue([{
                    google_event_id: 'G1',
                    status_kehadiran: 'hadir',
                    update: jest.fn(),
                    periodeJabatan: { pimpinan: { is_calendar_synced: true } }
                }]);

                const req = mockReq({ status: 'rejected_sespri' }, USER, PARAMS);
                const res = mockRes();
                
                // Mock representative find
                SlotAgendaPimpinan.findOne.mockResolvedValue({
                    periodeJabatanHadir: { pimpinan: { is_calendar_synced: true } }
                });

                await AgendaController.verifyAgenda(req, res);

                expect(googleCalendarHelper.deleteEvent).toHaveBeenCalled();
            });

            test('4. DeleteEvent terpanggil untuk status_kehadiran diwakilkan', async () => {
                const agenda = { id_agenda: 'AG001', update: jest.fn(), id_user_pemohon: 'PEM1' };
                Agenda.findByPk.mockResolvedValue(agenda);
                
                // Pimpinan who was delegated to
                AgendaPimpinan.findAll.mockResolvedValue([{
                    google_event_id: 'G1',
                    status_kehadiran: 'diwakilkan',
                    update: jest.fn(),
                    periodeJabatan: { pimpinan: { is_calendar_synced: true } }
                }]);

                const req = mockReq({ status: 'rejected_sespri' }, USER, PARAMS);
                const res = mockRes();
                
                // Mock the representative slot find
                SlotAgendaPimpinan.findOne.mockResolvedValue({
                    periodeJabatanHadir: { pimpinan: { is_calendar_synced: true } }
                });

                await AgendaController.verifyAgenda(req, res);

                // SlotAgendaPimpinan should be searched
                expect(SlotAgendaPimpinan.findOne).toHaveBeenCalled();
                // DeleteEvent should be called for the representative
                expect(googleCalendarHelper.deleteEvent).toHaveBeenCalled();
            });

            test('2. Handle Google Sync failure (syncError branch)', async () => {
                const agenda = { id_agenda: 'AG001', update: jest.fn(), id_user_pemohon: 'PEM1' };
                Agenda.findByPk.mockResolvedValue(agenda);
                AgendaPimpinan.findAll.mockResolvedValue([{
                    google_event_id: 'G1',
                    status_kehadiran: 'hadir',
                    update: jest.fn(),
                    periodeJabatan: { pimpinan: { is_calendar_synced: true } }
                }]);
                googleCalendarHelper.deleteEvent.mockRejectedValue(new Error('Sync Fail'));

                const req = mockReq({ status: 'canceled' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.verifyAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(201); // Success code still sent
            });

            test('3. Handle Notification failure (notifError branch)', async () => {
                const agenda = { id_agenda: 'AG001', update: jest.fn(), id_user_pemohon: 'PEM1', nama_kegiatan: 'X' };
                Agenda.findByPk.mockResolvedValue(agenda);
                AgendaPimpinan.findAll.mockResolvedValue([{ id_jabatan: 'J1', id_periode: 'P1' }]);
                PimpinanAjudan.findAll.mockResolvedValue([{ id_user_ajudan: 'AJU1' }]);
                
                // First notification (to pemohon) succeeds, second (to ajudan) fails
                sendPushNotification
                    .mockResolvedValueOnce(null) // for pemohon
                    .mockRejectedValueOnce(new Error('Notif Fail')); // for ajudan inside try/catch

                const req = mockReq({ status: 'approved_sespri' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.verifyAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(201); // Still success because caught
            });
        });
    });

    // 8. getLeaderAgendas()
    describe('8. getLeaderAgendas()', () => {
        test('1. Admin: Return 200 monitoring semua pimpinan', async () => {
            const req = mockReq({}, { nama_role: 'Admin' });
            req.query = { start_date: '2025-01-01', end_date: '2025-01-31' };
            const res = mockRes();
            Agenda.findAll.mockResolvedValue([{ id: 1 }]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Ajudan: Return 200 monitoring pimpinan sendiri', async () => {
            const req = mockReq({}, { nama_role: 'Ajudan', id_user: 'AJU1' });
            req.query = { id_jabatan: 'J1' };
            const res = mockRes();
            PimpinanAjudan.findAll.mockResolvedValue([{ id_jabatan: 'J1', id_periode: 'P1' }]);
            Agenda.findAll.mockResolvedValue([]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(Agenda.findAll).toHaveBeenCalled();
        });

        test('3. Ajudan: Return 403 jika monitoring pimpinan orang lain', async () => {
            const req = mockReq({}, { nama_role: 'Ajudan', id_user: 'AJU1' });
            req.query = { id_jabatan: 'J2' }; // Unauthorized ID
            const res = mockRes();
            PimpinanAjudan.findAll.mockResolvedValue([{ id_jabatan: 'J1', id_periode: 'P1' }]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('4. Ajudan: Return 200 (empty) jika belum punya penugasan', async () => {
            const req = mockReq({}, { nama_role: 'Ajudan', id_user: 'AJU1' });
            const res = mockRes();
            PimpinanAjudan.findAll.mockResolvedValue([]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
        });

        test('5. Admin: Filter by specific pimpinan', async () => {
            const req = mockReq({}, { nama_role: 'Admin' }, {}, null, { pimpinan_id: 'P1' });
            const res = mockRes();
            Agenda.findAll.mockResolvedValue([]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('6. Sespri: Return 200 monitoring', async () => {
            const req = mockReq({}, { nama_role: 'Sespri' });
            const res = mockRes();
            Agenda.findAll.mockResolvedValue([]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('9. Filter by start_date only', async () => {
            const req = mockReq({}, { nama_role: 'Admin' });
            req.query = { start_date: '2025-01-01' };
            const res = mockRes();
            Agenda.findAll.mockResolvedValue([]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('7. Ajudan: Monitoring semua pimpinan yang ditugaskan (tanpa query id_jabatan)', async () => {
            const req = mockReq({}, { nama_role: 'Ajudan', id_user: 'AJU1' });
            const res = mockRes();
            PimpinanAjudan.findAll.mockResolvedValue([
                { id_jabatan: 'J1', id_periode: 'P1' },
                { id_jabatan: 'J2', id_periode: 'P2' }
            ]);
            Agenda.findAll.mockResolvedValue([]);
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(Agenda.findAll).toHaveBeenCalled();
        });

        test('8. Return 500 jika error', async () => {
            const req = mockReq({}, { nama_role: 'Admin' });
            const res = mockRes();
            Agenda.findAll.mockRejectedValue(new Error());
            await AgendaController.getLeaderAgendas(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // 9. updateAgenda()
    describe('9. updateAgenda()', () => {
        const PARAMS = { id_agenda: 'AG001' };
        const USER = { id_user: 'PEM1', nama_role: 'Pemohon' };
        const BODY = { nama_kegiatan: 'Update Rapat' };

        describe('9.1 Authorization', () => {
            test('1. Return 403 jika user bukan pemilik', async () => {
                Agenda.findByPk.mockResolvedValue({ id_user_pemohon: 'OTHER', statusAgendas: [] });
                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(403);
            });

            test('2. Sespri bisa edit agenda siapapun', async () => {
                const sespri = { id_user: 'SESP1', nama_role: 'Sespri' };
                const agenda = { id_user_pemohon: 'PEM1', statusAgendas: [], update: jest.fn() };
                Agenda.findByPk.mockResolvedValue(agenda);
                const req = mockReq(BODY, sespri, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(agenda.update).toHaveBeenCalled();
            });

            test('3. Return 404 jika agenda tidak ditemukan (authorization check)', async () => {
                Agenda.findByPk.mockResolvedValue(null);
                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });
        });

        describe('9.2 Validation', () => {
            test('1. Return 400 jika status bukan revision (untuk Pemohon)', async () => {
                Agenda.findByPk.mockResolvedValue({ 
                    id_user_pemohon: 'PEM1',
                    statusAgendas: [{ status_agenda: 'pending' }]
                });
                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('2. Return 400 jika tanggal invalid (sudah lewat)', async () => {
                Agenda.findByPk.mockResolvedValue({ 
                    id_user_pemohon: 'PEM1',
                    statusAgendas: [{ status_agenda: 'revision' }]
                });
                const req = mockReq({ tanggal_kegiatan: '2000-01-01' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('3. Return 400 jika file > 5MB', async () => {
                Agenda.findByPk.mockResolvedValue({ id_user_pemohon: 'PEM1', statusAgendas: [{ status_agenda: 'revision' }] });
                const req = mockReq({}, USER, PARAMS, { size: 6 * 1024 * 1024 });
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('4. Return 400 jika waktu_selesai <= waktu_mulai', async () => {
                Agenda.findByPk.mockResolvedValue({ id_user_pemohon: 'PEM1', statusAgendas: [{ status_agenda: 'revision' }] });
                const req = mockReq({ waktu_mulai: '10:00', waktu_selesai: '09:00' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            test('5. Return 400 jika nomor_surat baru sudah digunakan permohonan lain', async () => {
                Agenda.findByPk.mockResolvedValue({ id_user_pemohon: 'PEM1', statusAgendas: [{ status_agenda: 'revision' }] });
                Agenda.findOne.mockResolvedValue({ id_agenda: 'AG999' }); // Conflict found
                const req = mockReq({ nomor_surat: 'S-DUP' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('sudah digunakan oleh permohonan lain Anda') }));
            });
        });

        describe('9.3 Edge Cases', () => {
            test('1. Handle invalid KASKPD JSON string', async () => {
                const sespri = { id_user: 'SESP1', nama_role: 'Sespri' };
                Agenda.findByPk.mockResolvedValue({ id_user_pemohon: 'PEM1', update: jest.fn() });
                const req = mockReq({ kaskpd_pendamping: 'INVALID_JSON' }, sespri, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);
                expect(KASKPDPendamping.create).toHaveBeenCalledWith(expect.objectContaining({ id_ka_skpd: 'INVALID_JSON' }), expect.anything());
            });

            test('2. Trigger resync for confirmed pimpinan', async () => {
                const sespri = { id_user: 'SESP1', nama_role: 'Sespri' };
                const agenda = { id_user_pemohon: 'PEM1', update: jest.fn(), id_agenda: 'AG1' };
                Agenda.findByPk.mockResolvedValue(agenda);
                AgendaPimpinan.findAll.mockResolvedValue([{
                    google_event_id: 'G1',
                    status_kehadiran: 'hadir',
                    periodeJabatan: { pimpinan: { is_calendar_synced: true } }
                }]);
                const req = mockReq(BODY, sespri, PARAMS);
                const res = mockRes();

                // Mock representative find for update sync cleanup
                SlotAgendaPimpinan.findOne.mockResolvedValue({
                    periodeJabatanHadir: { pimpinan: { is_calendar_synced: true } }
                });

                await AgendaController.updateAgenda(req, res);
                expect(googleCalendarHelper.syncEvent).toHaveBeenCalled();
            });
        });

        describe('9.3 Success', () => {
            test('1. Update data dan status kembali ke pending (Pemohon)', async () => {
                const agenda = { 
                    id_user_pemohon: 'PEM1',
                    statusAgendas: [{ status_agenda: 'revision' }],
                    update: jest.fn(),
                    id_agenda: 'AG1'
                };
                Agenda.findByPk.mockResolvedValue(agenda);
                StatusAgenda.findOne.mockResolvedValue(null);
                AgendaPimpinan.findAll.mockResolvedValue([]);

                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);

                expect(agenda.update).toHaveBeenCalled();
                expect(StatusAgenda.create).toHaveBeenCalledWith(expect.objectContaining({ status_agenda: 'pending' }), expect.anything());
            });

            test('2. Sespri update KASKPD pendamping', async () => {
                const sespri = { id_user: 'SESP1', nama_role: 'Sespri' };
                const agenda = { id_user_pemohon: 'PEM1', update: jest.fn(), id_agenda: 'AG1' };
                Agenda.findByPk.mockResolvedValue(agenda);
                const req = mockReq({ kaskpd_pendamping: ['K1'] }, sespri, PARAMS);
                const res = mockRes();
                await AgendaController.updateAgenda(req, res);

                expect(KASKPDPendamping.destroy).toHaveBeenCalled();
                expect(KASKPDPendamping.create).toHaveBeenCalled();
            });
        });

        test('4. Return 500 jika error', async () => {
            Agenda.findByPk.mockRejectedValue(new Error());
            const req = mockReq({}, USER, PARAMS);
            const res = mockRes();
            await AgendaController.updateAgenda(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // 10. updateLeaderAttendance()
    describe('10. updateLeaderAttendance()', () => {
        const PARAMS = { id_agenda: 'AG1', id_jabatan: 'J1', id_periode: 'P1' };
        const USER = { id_user: 'AJU1', nama_role: 'Ajudan' };
        const BODY = { status_kehadiran: 'hadir', keterangan: 'OK' };

        describe('10.1 Security', () => {
            test('1. Return 403 jika ajudan tidak punya akses ke pimpinan', async () => {
                PimpinanAjudan.findOne.mockResolvedValue(null);
                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);
                expect(res.status).toHaveBeenCalledWith(403);
            });
        });

        describe('10.2 Error', () => {
            test('1. Return 404 jika agenda tidak ditemukan', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                AgendaPimpinan.findOne.mockResolvedValue(null);
                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            test('2. Return 400 jika perwakilan sudah masuk dalam daftar undangan', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { 
                    id_agenda: 'AG1',
                    agenda: { tanggal_kegiatan: '2099-01-01', waktu_selesai: '10:00' }
                };
                AgendaPimpinan.findOne
                    .mockResolvedValueOnce(ap) // First call: find the record to update
                    .mockResolvedValueOnce({ id_agenda: 'AG1', id_jabatan: 'J2' }); // Second call: validation check

                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: { nama_pimpinan: 'Pimpinan B' } });
                
                const req = mockReq({ status_kehadiran: 'diwakilkan', id_jabatan_perwakilan: 'J2' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                    message: expect.stringContaining('sudah masuk dalam daftar undangan agenda ini') 
                }));
                expect(mockTx.rollback).toHaveBeenCalled();
            });

            test('3. Return 400 jika agenda sudah lewat/selesai', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 1); // Yesterday
                const pastDateStr = pastDate.toISOString().split('T')[0];

                const ap = { 
                    id_agenda: 'AG1',
                    agenda: { 
                        tanggal_kegiatan: pastDateStr, 
                        waktu_selesai: '10:00' 
                    },
                    update: jest.fn()
                };
                AgendaPimpinan.findOne.mockResolvedValue(ap);

                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                
                await AgendaController.updateLeaderAttendance(req, res);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                    message: 'Agenda sudah selesai/lewat, tidak dapat mengubah status kehadiran.' 
                }));
                expect(mockTx.rollback).toHaveBeenCalled();
            });
        });

        describe('10.3 Conflict Test', () => {
            test('1. Return 409 jika slot bentrok', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { 
                    id_agenda: 'AG1',
                    agenda: { waktu_mulai: '08:00', waktu_selesai: '10:00', tanggal_kegiatan: '2099-01-01' },
                    update: jest.fn()
                };
                AgendaPimpinan.findOne.mockResolvedValue(ap);
                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: { nama_pimpinan: 'Budi' } });
                
                SlotWaktu.findAll.mockResolvedValue([{ id_slot_waktu: 1 }]);
                // Mock conflict
                SlotAgendaPimpinan.findAll.mockResolvedValue([{ agenda: { nama_kegiatan: 'Bentrok' } }]);

                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(res.status).toHaveBeenCalledWith(409);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Bentrok') }));
                expect(mockTx.rollback).toHaveBeenCalled();
            });
        });

        describe('10.4 Success', () => {
            test('1. Return 200 jika update kehadiran pimpinan sukses (buat slot)', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { 
                    id_agenda: 'AG1',
                    google_event_id: null,
                    agenda: { waktu_mulai: '08:00', waktu_selesai: '10:00', tanggal_kegiatan: '2099-01-01' },
                    update: jest.fn()
                };
                AgendaPimpinan.findOne.mockResolvedValue(ap);
                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: { nama_pimpinan: 'Budi' } });
                SlotWaktu.findAll.mockResolvedValue([{ id_slot_waktu: 1 }]);
                SlotAgendaPimpinan.findAll.mockResolvedValue([]); // No conflict
                SlotAgendaPimpinan.findOne.mockResolvedValue(null); // Create new slot
                StatusAgenda.findOne.mockResolvedValue(null); // generateStatusId
                SlotAgendaPimpinan.count.mockResolvedValue(1); // No cleanup needed
                
                Pimpinan.findByPk.mockResolvedValue({ is_calendar_synced: false });

                const req = mockReq(BODY, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(ap.update).toHaveBeenCalledWith(expect.objectContaining({ status_kehadiran: 'hadir' }), expect.anything());
                expect(SlotAgendaPimpinan.destroy).toHaveBeenCalledWith(expect.objectContaining({ transaction: mockTx }));
                expect(SlotAgendaPimpinan.create).toHaveBeenCalled();
                expect(StatusAgenda.create).toHaveBeenCalledWith(expect.objectContaining({ status_agenda: 'approved_ajudan' }), expect.anything());
                expect(mockTx.commit).toHaveBeenCalled();
            });

            test('2. Return 200 jika slot cleanup terpanggil (tidak ada pimpinan hadir)', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { id_agenda: 'AG1', agenda: { waktu_mulai: '08:00', waktu_selesai: '10:00' }, update: jest.fn() };
                AgendaPimpinan.findOne.mockResolvedValue(ap);
                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: {} });
                SlotWaktu.findAll.mockResolvedValue([]);
                SlotAgendaPimpinan.count.mockResolvedValue(0); // Trigger cleanup
                Penugasan.findAll.mockResolvedValue([{ id_penugasan: 'P1' }]);
                StatusAgenda.findOne.mockResolvedValue(null);

                const req = mockReq({ status_kehadiran: 'tidak_hadir' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(SlotAgendaStaff.destroy).toHaveBeenCalled();
                expect(Penugasan.destroy).toHaveBeenCalled();
            });

            test('3. Return 200 jika status tidak hadir (delete Google Event)', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { 
                    id_agenda: 'AG1',
                    google_event_id: 'G1',
                    agenda: { waktu_mulai: '08:00', waktu_selesai: '10:00' },
                    update: jest.fn()
                };
                AgendaPimpinan.findOne.mockResolvedValue(ap);
                PeriodeJabatan.findOne.mockResolvedValue({ id_pimpinan: 'P1', pimpinan: { nama_pimpinan: 'Budi' } });
                SlotWaktu.findAll.mockResolvedValue([]);
                StatusAgenda.findOne.mockResolvedValue(null);
                Pimpinan.findByPk.mockResolvedValue({ is_calendar_synced: true });

                const req = mockReq({ status_kehadiran: 'tidak_hadir' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(googleCalendarHelper.deleteEvent).toHaveBeenCalled();
            });

            test('3b. Clear google_event_id in DB if original leader is null but event ID exists', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { 
                    id_agenda: 'AG1',
                    google_event_id: 'G1',
                    agenda: { waktu_mulai: '08:00', waktu_selesai: '10:00' },
                    update: jest.fn()
                };
                AgendaPimpinan.findOne.mockResolvedValue(ap);
                PeriodeJabatan.findOne.mockResolvedValue({ id_pimpinan: 'P1', pimpinan: { nama_pimpinan: 'Budi' } });
                SlotWaktu.findAll.mockResolvedValue([]);
                StatusAgenda.findOne.mockResolvedValue(null);
                Pimpinan.findByPk.mockResolvedValue(null);

                const req = mockReq({ status_kehadiran: 'tidak_hadir' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(ap.update).toHaveBeenCalledWith({ google_event_id: null });
            });

            test('4. Return 200 jika notifikasi terkirim ke Kasubag & Sespri', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                AgendaPimpinan.findOne.mockResolvedValue({ agenda: {}, update: jest.fn() });
                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: {} });
                SlotWaktu.findAll.mockResolvedValue([]);
                StatusAgenda.findOne.mockResolvedValue(null);
                User.findAll.mockResolvedValue([{ id_user: 'K1', role: { nama_role: 'Kasubag Media' } }]);

                const req = mockReq({ status_kehadiran: 'hadir' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(sendPushNotification).toHaveBeenCalledWith('K1', expect.anything());
            });

            test('7. Target URL for Kasubag Protokol', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                AgendaPimpinan.findOne.mockResolvedValue({ agenda: {}, update: jest.fn() });
                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: {} });
                SlotWaktu.findAll.mockResolvedValue([]);
                StatusAgenda.findOne.mockResolvedValue(null);
                User.findAll.mockResolvedValue([{ id_user: 'K2', role: { nama_role: 'Kasubag Protokol' } }]);

                const req = mockReq({ status_kehadiran: 'hadir', id_agenda: 'AG1', id_jabatan: 'J1', id_periode: 'P1' }, { id_user: 'AJU1', nama_role: 'Ajudan' }, { id_agenda: 'AG1', id_jabatan: 'J1', id_periode: 'P1' });
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);
                expect(sendPushNotification).toHaveBeenCalledWith('K2', expect.objectContaining({ data: expect.objectContaining({ url: '/kasubag-protokol/assign-staff' }) }));
            });

            test('5. Return 200 jika status diwakilkan (fetch repPimpinan)', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { agenda: {}, update: jest.fn() };
                AgendaPimpinan.findOne
                    .mockResolvedValueOnce(ap) // First call: existing record
                    .mockResolvedValueOnce(null); // Second call: validation check (not invited)
                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: { nama_pimpinan: 'Rep 1' } }); // for repPimpinan
                SlotWaktu.findAll.mockResolvedValue([]);
                StatusAgenda.findOne.mockResolvedValue(null);

                const req = mockReq({ status_kehadiran: 'diwakilkan', id_jabatan_perwakilan: 'J2', id_periode_perwakilan: 'P2' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(ap.update).toHaveBeenCalledWith(expect.objectContaining({ nama_perwakilan: 'Rep 1' }), expect.anything());
            });

            test('6. Return 200 jika update existing slot sukses', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { agenda: { waktu_mulai: '08:00', waktu_selesai: '10:00' }, update: jest.fn() };
                AgendaPimpinan.findOne.mockResolvedValue(ap);
                PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: {} });
                SlotWaktu.findAll.mockResolvedValue([{ id_slot_waktu: 1 }]);
                SlotAgendaPimpinan.findAll.mockResolvedValue([]); // conflict
                const mockExistingSlot = { update: jest.fn() };
                SlotAgendaPimpinan.findOne.mockResolvedValue(mockExistingSlot);
                StatusAgenda.findOne.mockResolvedValue(null);

                const req = mockReq({ status_kehadiran: 'hadir' }, USER, PARAMS);
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);

                expect(mockExistingSlot.update).toHaveBeenCalled();
            });

            test('8. Update google_event_id if it changed after sync', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                const ap = { 
                    id_pimpinan: 'P1', 
                    google_event_id: 'OLD', 
                    status_kehadiran: 'hadir',
                    update: jest.fn(),
                    agenda: { waktu_mulai: '08:00', waktu_selesai: '10:00' }
                };
                AgendaPimpinan.findOne.mockResolvedValue(ap);
                PeriodeJabatan.findOne.mockResolvedValue({ id_pimpinan: 'P1', pimpinan: { id_pimpinan: 'P1' } });
                
                // Now called twice: one for pimpinanToSync, one for originalPimpinan logic
                Pimpinan.findByPk.mockResolvedValue({ id_pimpinan: 'P1', is_calendar_synced: true });
                
                SlotWaktu.findAll.mockResolvedValue([]);
                User.findAll.mockResolvedValue([]);
                
                googleCalendarHelper.syncEvent.mockResolvedValue('NEW');

                const req = mockReq({ status_kehadiran: 'hadir', id_agenda: 'AG1', id_jabatan: 'J1', id_periode: 'P1' }, { id_user: 'AJU1', nama_role: 'Ajudan' }, { id_agenda: 'AG1', id_jabatan: 'J1', id_periode: 'P1' });
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);
                expect(ap.update).toHaveBeenCalledWith(expect.objectContaining({ google_event_id: 'NEW' }));
            });

            test('9. Log error if scheduled sync fails', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                AgendaPimpinan.findOne.mockResolvedValue({ agenda: {}, status_kehadiran: 'hadir', update: jest.fn() });
                PeriodeJabatan.findOne.mockResolvedValue({ id_pimpinan: 'P1', pimpinan: { id_pimpinan: 'P1' } });
                Pimpinan.findByPk.mockResolvedValue({ id_pimpinan: 'P1', is_calendar_synced: true });
                googleCalendarHelper.syncEvent.mockRejectedValue(new Error('Sync Fail'));
                SlotWaktu.findAll.mockResolvedValue([]);
                User.findAll.mockResolvedValue([]);
                
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                const req = mockReq({ status_kehadiran: 'hadir', id_agenda: 'AG1', id_jabatan: 'J1', id_periode: 'P1' }, { id_user: 'AJU1', nama_role: 'Ajudan' }, { id_agenda: 'AG1', id_jabatan: 'J1', id_periode: 'P1' });
                const res = mockRes();
                await AgendaController.updateLeaderAttendance(req, res);
                expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SIMAP Google Calendar Sync Error'), expect.any(Error));
                consoleSpy.mockRestore();
            });

            test('10. Sync to representative pimpinan if delegated internally', async () => {
                PimpinanAjudan.findOne.mockResolvedValue({});
                
                const ap = { 
                    id_pimpinan: 'ORIG_P1', 
                    google_event_id: 'OLD_EV', 
                    status_kehadiran: 'diwakilkan', 
                    update: jest.fn(),
                    agenda: { id_agenda: 'AG1', nama_kegiatan: 'Test' }
                };
                
                AgendaPimpinan.findOne
                    .mockResolvedValueOnce(ap) // original fetch
                    .mockResolvedValueOnce(null); // validation check
                
                // Mock PeriodeJabatan.findOne for all 3 calls
                PeriodeJabatan.findOne
                    .mockResolvedValueOnce({ id_pimpinan: 'ORIG_P1', pimpinan: { nama_pimpinan: 'Orig' } }) // origPimpinan line 956
                    .mockResolvedValueOnce({ pimpinan: { nama_pimpinan: 'Rep' } }) // repPimpinan line 967
                    .mockResolvedValueOnce({ id_pimpinan: 'REP_P1' }); // line 1226 (Identify Sync Target)
                
                // Mock previous representative for pre-cleanup at line 993
                SlotAgendaPimpinan.findOne.mockResolvedValue({
                    update: jest.fn(),
                    periodeJabatanHadir: { pimpinan: { id_pimpinan: 'PREV_REP', is_calendar_synced: true, nama_pimpinan: 'Prev' } }
                });
                
                // Pimpinan.findByPk calls:
                // 1. originalPimpinan at line 1230
                // 2. repPimpinan at line 1259
                Pimpinan.findByPk
                    .mockResolvedValueOnce({ id_pimpinan: 'ORIG_P1', is_calendar_synced: true, nama_pimpinan: 'Orig' })
                    .mockResolvedValueOnce({ id_pimpinan: 'REP_P1', is_calendar_synced: true, nama_pimpinan: 'Rep' });
                
                SlotWaktu.findAll.mockResolvedValue([]);
                User.findAll.mockResolvedValue([]);
                googleCalendarHelper.deleteEvent.mockResolvedValue();
                googleCalendarHelper.syncEvent.mockResolvedValue('REP_EV_ID');

                const req = mockReq({ 
                    status_kehadiran: 'diwakilkan', 
                    id_jabatan_perwakilan: 'J_REP', 
                    id_periode_perwakilan: 'P_REP' 
                }, USER, PARAMS);
                const res = mockRes();
                
                await AgendaController.updateLeaderAttendance(req, res);

                // Should delete from original (because moving to rep) - Happens first in code
                expect(googleCalendarHelper.deleteEvent).toHaveBeenCalledWith(
                    expect.objectContaining({ id_pimpinan: 'ORIG_P1' }),
                    'OLD_EV'
                );

                // Should delete from previous representative (new pre-cleanup) - Happens second in code
                expect(googleCalendarHelper.deleteEvent).toHaveBeenCalledWith(
                    expect.objectContaining({ id_pimpinan: 'PREV_REP' }),
                    'OLD_EV'
                );
                
                // Should sync to representative
                expect(googleCalendarHelper.syncEvent).toHaveBeenCalledWith(
                    expect.objectContaining({ id_pimpinan: 'REP_P1' }),
                    expect.anything(),
                    null, // existingId should be null because it was deleted above
                    expect.anything()
                );
                
                expect(ap.update).toHaveBeenCalledWith(expect.objectContaining({ google_event_id: 'REP_EV_ID' }));
            });
        });

        test('5. Return 500 jika error (updateLeaderAttendance)', async () => {
            PimpinanAjudan.findOne.mockResolvedValue({});
            AgendaPimpinan.findOne.mockResolvedValue({ agenda: { id_agenda: 'A1' }, update: jest.fn() });
            PeriodeJabatan.findOne.mockResolvedValue({ pimpinan: {} });
            SlotWaktu.findAll.mockResolvedValue([]);
            SlotAgendaPimpinan.destroy.mockRejectedValue(new Error('fail'));

            const req = mockReq({ status_kehadiran: 'hadir' }, USER, PARAMS);
            const res = mockRes();
            await AgendaController.updateLeaderAttendance(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockTx.rollback).toHaveBeenCalled();
        });
    });

    // 12. updateAgendaSlots()
    describe('11. cancelAgenda()', () => {
        const PARAMS = { id_agenda: 'AG1' };
        const USER = { id_user: 'PEM1', nama_role: 'Pemohon' };

        describe('11.1 Validation', () => {
            test('1. Return 404 jika agenda tidak ditemukan', async () => {
                Agenda.findByPk.mockResolvedValue(null);
                const req = mockReq({}, USER, PARAMS);
                const res = mockRes();
                await AgendaController.cancelAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            test('2. Return 403 jika bukan pemilik', async () => {
                Agenda.findByPk.mockResolvedValue({ id_user_pemohon: 'OTHER' });
                const req = mockReq({}, USER, PARAMS);
                const res = mockRes();
                await AgendaController.cancelAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(403);
            });

            test('3. Return 400 jika status tidak valid (bukan pending/revision)', async () => {
                Agenda.findByPk.mockResolvedValue({ 
                    id_user_pemohon: 'PEM1',
                    statusAgendas: [{ status_agenda: 'approved_sespri' }]
                });
                const req = mockReq({}, USER, PARAMS);
                const res = mockRes();
                await AgendaController.cancelAgenda(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });
        });

        describe('11.2 Success', () => {
            test('1. Return 201 jika berhasil cancel (status canceled & deleteEvent)', async () => {
                const agenda = { 
                    id_user_pemohon: 'PEM1',
                    statusAgendas: [{ status_agenda: 'pending' }],
                    update: jest.fn(),
                    id_agenda: 'AG1'
                };
                Agenda.findByPk.mockResolvedValue(agenda);
                StatusAgenda.findOne.mockResolvedValue(null);
                AgendaPimpinan.findAll.mockResolvedValue([{
                    google_event_id: 'G1',
                    status_kehadiran: 'hadir',
                    update: jest.fn(),
                    id_agenda: 'AG1',
                    periodeJabatan: { pimpinan: { is_calendar_synced: true } }
                }]);

                const req = mockReq({}, USER, PARAMS);
                const res = mockRes();

                // Mock representative find for cancellation cleanup
                SlotAgendaPimpinan.findOne.mockResolvedValue({
                    periodeJabatanHadir: { pimpinan: { is_calendar_synced: true } }
                });

                await AgendaController.cancelAgenda(req, res);

                expect(StatusAgenda.create).toHaveBeenCalledWith(expect.objectContaining({ status_agenda: 'canceled' }), expect.anything());
                expect(googleCalendarHelper.deleteEvent).toHaveBeenCalled();
                expect(mockTx.commit).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
            });

            test('2. Log error if cancel sync fails', async () => {
                const agenda = {
                    id_user_pemohon: 'PEM1',
                    statusAgendas: [{ status_agenda: 'pending' }],
                    update: jest.fn(),
                    id_agenda: 'AG1'
                };
                Agenda.findByPk.mockResolvedValue(agenda);
                AgendaPimpinan.findAll.mockResolvedValue([{
                    google_event_id: 'G1',
                    status_kehadiran: 'hadir',
                    periodeJabatan: { pimpinan: { is_calendar_synced: true } }
                }]);
                googleCalendarHelper.deleteEvent.mockRejectedValue(new Error('Sync Fail'));

                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                const req = mockReq({}, USER, PARAMS);
                const res = mockRes();
                await AgendaController.cancelAgenda(req, res);
                expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Agenda Cancellation Sync Failed:'), expect.any(Error));
                consoleSpy.mockRestore();
            });

            test('3. Return 201 jika berhasil cancel (status_kehadiran diwakilkan & deleteEvent)', async () => {
                const agenda = { 
                    id_user_pemohon: 'PEM1',
                    statusAgendas: [{ status_agenda: 'pending' }],
                    update: jest.fn(),
                    id_agenda: 'AG1'
                };
                Agenda.findByPk.mockResolvedValue(agenda);
                StatusAgenda.findOne.mockResolvedValue(null);
                AgendaPimpinan.findAll.mockResolvedValue([{
                    google_event_id: 'G1',
                    status_kehadiran: 'diwakilkan',
                    update: jest.fn(),
                    id_agenda: 'AG1',
                    periodeJabatan: { pimpinan: { is_calendar_synced: true } }
                }]);

                const req = mockReq({}, USER, PARAMS);
                const res = mockRes();

                // Mock representative find for cancellation cleanup
                SlotAgendaPimpinan.findOne.mockResolvedValue({
                    periodeJabatanHadir: { pimpinan: { is_calendar_synced: true } }
                });

                await AgendaController.cancelAgenda(req, res);

                expect(StatusAgenda.create).toHaveBeenCalledWith(expect.objectContaining({ status_agenda: 'canceled' }), expect.anything());
                expect(googleCalendarHelper.deleteEvent).toHaveBeenCalled();
                expect(mockTx.commit).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(201);
            });
        });

        test('4. Return 500 jika error (cancelAgenda)', async () => {
            Agenda.findByPk.mockRejectedValue(new Error());
            const req = mockReq({}, USER, PARAMS);
            const res = mockRes();
            await AgendaController.cancelAgenda(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockTx.rollback).toHaveBeenCalled();
        });
    });

    // 12. updateAgendaSlots()
    describe('12. updateAgendaSlots()', () => {
        test('1. Return 200 jika sukses (destroy & bulkCreate)', async () => {
            const req = mockReq({ id_agenda: 'AG1', slots: [{ id_slot_waktu: 1 }] });
            const res = mockRes();

            await AgendaController.updateAgendaSlots(req, res);

            expect(SlotAgendaPimpinan.destroy).toHaveBeenCalledWith(expect.objectContaining({ 
                where: { id_agenda: 'AG1' },
                transaction: mockTx 
            }));
            expect(SlotAgendaPimpinan.bulkCreate).toHaveBeenCalled();
            expect(mockTx.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('2. Return 500 jika error (updateAgendaSlots)', async () => {
            const req = mockReq({ id_agenda: 'AG1', slots: [] });
            const res = mockRes();
            SlotAgendaPimpinan.destroy.mockRejectedValue(new Error('fail'));
            await AgendaController.updateAgendaSlots(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockTx.rollback).toHaveBeenCalled();
        });
    });
});
