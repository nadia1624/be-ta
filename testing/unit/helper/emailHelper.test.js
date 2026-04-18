const nodemailer = require('nodemailer');
const emailHelper = require('../../../helpers/emailHelper');

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Helper', () => {
  let mockSendMail;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue(true);
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail
    });
    
    emailHelper.transporter = { sendMail: mockSendMail };
    
    jest.clearAllMocks();
  });

  test('sendSyncInvitation should send an email with correct parameters', async () => {
    const pimpinan = { email: 'pimpinan@test.com', nama_pimpinan: 'Bapak Pimpinan' };
    const authUrl = 'http://auth.url';

    const result = await emailHelper.sendSyncInvitation(pimpinan, authUrl);

    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: pimpinan.email,
      subject: 'Undangan Sinkronisasi Google Calendar - SIMAP',
      html: expect.stringContaining(authUrl)
    }));
  });

  test('sendPasswordResetEmail should send an email with correct parameters', async () => {
    const user = { email: 'user@test.com', nama: 'Nama User' };
    const resetUrl = 'http://reset.url';

    const result = await emailHelper.sendPasswordResetEmail(user, resetUrl);

    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: user.email,
      subject: 'Atur Ulang Kata Sandi - SIMAP',
      html: expect.stringContaining(resetUrl)
    }));
  });

  test('should throw error if sendMail fails', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP Error'));
    const user = { email: 'user@test.com' };

    await expect(emailHelper.sendSyncInvitation(user, 'url')).rejects.toThrow('SMTP Error');
  });
});
