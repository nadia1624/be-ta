const { google } = require('googleapis');
const googleCalendarHelper = require('../../../helpers/googleCalendarHelper');

describe('Google Calendar Helper', () => {
    let mockOAuth2;
    let mockEvents;

    beforeEach(() => {
        jest.clearAllMocks();

        // 1. Create mock instances
        mockOAuth2 = {
            setCredentials: jest.fn(),
            generateAuthUrl: jest.fn().mockReturnValue('mock-url'),
            getToken: jest.fn().mockResolvedValue({ tokens: { access_token: 'token' } }),
        };

        mockEvents = {
            insert: jest.fn().mockResolvedValue({ data: { id: 'new_id' } }),
            patch: jest.fn().mockResolvedValue({ data: { id: 'patched_id' } }),
            delete: jest.fn().mockResolvedValue({}),
        };

        // 2. Spy on factory and getter
        jest.spyOn(googleCalendarHelper, '_createOAuth2Client').mockReturnValue(mockOAuth2);
        
        // 3. Mock google.calendar globally
        jest.spyOn(google, 'calendar').mockReturnValue({
            events: mockEvents
        });
    });

    test('getAuthUrl should work using the factory method', () => {
        const url = googleCalendarHelper.getAuthUrl('P001');
        
        expect(url).toBe('mock-url');
        expect(googleCalendarHelper._createOAuth2Client).toHaveBeenCalled();
        expect(mockOAuth2.generateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
            state: 'P001'
        }));
    });

    test('syncEvent should handle new event insertion', async () => {
        const pimpinan = { id_pimpinan: 'P001' };
        const agenda = { 
            nama_kegiatan: 'Test',
            tanggal_kegiatan: '2023-10-10',
            waktu_mulai: '10:00',
            waktu_selesai: '11:00'
        };

        const result = await googleCalendarHelper.syncEvent(pimpinan, agenda);

        expect(result).toBe('new_id');
        expect(mockOAuth2.setCredentials).toHaveBeenCalled();
        expect(mockEvents.insert).toHaveBeenCalled();
    });

    test('syncEvent should handle update when eventId is provided', async () => {
        const pimpinan = { google_access_token: 'at' };
        const agenda = { 
            nama_kegiatan: 'Update',
            tanggal_kegiatan: '2023-10-10'
        };
        const eventId = 'existing_id';

        const result = await googleCalendarHelper.syncEvent(pimpinan, agenda, eventId);

        expect(result).toBe('patched_id');
        expect(mockEvents.patch).toHaveBeenCalledWith(expect.objectContaining({
            eventId: eventId
        }));
    });

    test('deleteEvent should call calendar events delete', async () => {
        const pimpinan = { id_pimpinan: 'P001' };
        const eventId = 'delete_me';

        await googleCalendarHelper.deleteEvent(pimpinan, eventId);

        expect(mockOAuth2.setCredentials).toHaveBeenCalled();
        expect(mockEvents.delete).toHaveBeenCalledWith(expect.objectContaining({
            eventId: eventId
        }));
    });
});
