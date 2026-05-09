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

        // 4. Default restore oauth2Client
        googleCalendarHelper._oauth2Client = null;
    });

    afterEach(() => {
        googleCalendarHelper._oauth2Client = null;
    });

    describe('Initialization & Clients', () => {
        test('oauth2Client getter should initialize client if null', () => {
            googleCalendarHelper._oauth2Client = null;
            const client = googleCalendarHelper.oauth2Client;
            expect(client).toBe(mockOAuth2);
            expect(googleCalendarHelper._createOAuth2Client).toHaveBeenCalled();
        });

        test('oauth2Client getter should return existing client if not null', () => {
            const existingClient = { id: 'existing' };
            googleCalendarHelper._oauth2Client = existingClient;
            const client = googleCalendarHelper.oauth2Client;
            expect(client).toBe(existingClient);
            expect(googleCalendarHelper._createOAuth2Client).not.toHaveBeenCalled();
        });

        test('oauth2Client setter should update client', () => {
            const customClient = { id: 'custom' };
            googleCalendarHelper.oauth2Client = customClient;
            expect(googleCalendarHelper._oauth2Client).toBe(customClient);
        });

        test('setOAuth2Client should update client', () => {
            const customClient = { id: 'custom2' };
            googleCalendarHelper.setOAuth2Client(customClient);
            expect(googleCalendarHelper._oauth2Client).toBe(customClient);
        });

        test('getAuth() should set credentials correctly', () => {
            const pimpinan = { 
                google_access_token: 'at',
                google_refresh_token: 'rt',
                google_token_expiry: 123
            };
            // Accessing internal _getAuth for testing
            const auth = googleCalendarHelper._getAuth(pimpinan);
            expect(auth).toBe(mockOAuth2);
            expect(mockOAuth2.setCredentials).toHaveBeenCalledWith({
                access_token: 'at',
                refresh_token: 'rt',
                expiry_date: 123
            });
        });
    });

    test('getTokens should return tokens from oauth2Client', async () => {
        const tokens = await googleCalendarHelper.getTokens('mock-code');
        expect(tokens).toEqual({ access_token: 'token' });
        expect(mockOAuth2.getToken).toHaveBeenCalledWith('mock-code');
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
        const pimpinan = { id_pimpinan: 'P001', google_access_token: 'at' };
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

    test('syncEvent should handle formatting edge cases', async () => {
        const pimpinan = { google_access_token: 'at' };
        const agenda = { 
            nama_kegiatan: 'Edge Case',
            tanggal_kegiatan: new Date('2023-11-11'),
            waktu_mulai: null,
            waktu_selesai: '9:5' // Test padding
        };

        await googleCalendarHelper.syncEvent(pimpinan, agenda);

        expect(mockEvents.insert).toHaveBeenCalledWith(expect.objectContaining({
            resource: expect.objectContaining({
                start: expect.objectContaining({ dateTime: expect.stringContaining('2023-11-11T00:00:00') }),
                end: expect.objectContaining({ dateTime: expect.stringContaining('2023-11-11T09:05:00') })
            })
        }));
    });

    test('_createOAuth2Client should return a real OAuth2 instance', () => {
        // Restore to test the real factory method
        googleCalendarHelper._createOAuth2Client.mockRestore();
        const client = googleCalendarHelper._createOAuth2Client();
        expect(client).toBeDefined();
        // Re-mock for other tests
        jest.spyOn(googleCalendarHelper, '_createOAuth2Client').mockReturnValue(mockOAuth2);
    });

    test('syncEvent should throw and log error on failure', async () => {
        const error = new Error('Sync Failed');
        mockEvents.insert.mockRejectedValue(error);
        const pimpinan = { id_pimpinan: 'P', google_access_token: 'at' };
        const agenda = { tanggal_kegiatan: '2023-01-01' };
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(googleCalendarHelper.syncEvent(pimpinan, agenda)).rejects.toThrow('Sync Failed');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Calendar Sync Error'), error);
        consoleSpy.mockRestore();
    });

    test('deleteEvent should call calendar events delete', async () => {
        const pimpinan = { id_pimpinan: 'P001', google_access_token: 'at' };
        const eventId = 'delete_me';

        await googleCalendarHelper.deleteEvent(pimpinan, eventId);

        expect(mockEvents.delete).toHaveBeenCalledWith(expect.objectContaining({
            eventId: eventId
        }));
    });

    test('deleteEvent should return early if no eventId', async () => {
        await googleCalendarHelper.deleteEvent({}, null);
        expect(mockEvents.delete).not.toHaveBeenCalled();
    });

    test('deleteEvent should ignore 404 and 410 errors', async () => {
        const error404 = { code: 404 };
        const error410 = { code: 410 };
        
        mockEvents.delete.mockRejectedValueOnce(error404).mockRejectedValueOnce(error410);

        await googleCalendarHelper.deleteEvent({ google_access_token: 'at' }, 'id1');
        await googleCalendarHelper.deleteEvent({ google_access_token: 'at' }, 'id2');

        expect(mockEvents.delete).toHaveBeenCalledTimes(2);
        // No error should be thrown
    });

    test('deleteEvent should log and throw other errors', async () => {
        const error500 = { code: 500 };
        mockEvents.delete.mockRejectedValue(error500);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(googleCalendarHelper.deleteEvent({ google_access_token: 'at' }, 'id')).rejects.toEqual(error500);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
