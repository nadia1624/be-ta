const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('../../../middleware/authMiddleware');
const { sendResponse } = require('../../../helpers/response');

jest.mock('jsonwebtoken');
jest.mock('../../../helpers/response');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
  });

  describe('authenticateToken', () => {
    test('should return 401 if no token is provided', () => {
      authenticateToken(req, res, next);
      
      expect(sendResponse).toHaveBeenCalledWith(res, 401, false, 'Token tidak ditemukan, silakan login');
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if token is invalid', () => {
      req.headers['authorization'] = 'Bearer invalid_token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      authenticateToken(req, res, next);

      expect(sendResponse).toHaveBeenCalledWith(res, 403, false, 'Token tidak valid atau sudah expired');
      expect(next).not.toHaveBeenCalled();
    });

    test('should set req.user and call next() if token is valid', () => {
      const decodedUser = { id_user: 'U001', nama_role: 'admin' };
      req.headers['authorization'] = 'Bearer valid_token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, decodedUser);
      });

      authenticateToken(req, res, next);

      expect(req.user).toEqual(decodedUser);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorizeRoles', () => {
    test('should call next() if user has an allowed role', () => {
      req.user = { nama_role: 'admin' };
      const middleware = authorizeRoles('admin', 'sespri');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if user role is not allowed', () => {
      req.user = { nama_role: 'pemohon' };
      const middleware = authorizeRoles('admin', 'sespri');

      middleware(req, res, next);

      expect(sendResponse).toHaveBeenCalledWith(res, 403, false, 'Anda tidak memiliki akses ke resource ini');
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if req.user is missing', () => {
      req.user = null;
      const middleware = authorizeRoles('admin');

      middleware(req, res, next);

      expect(sendResponse).toHaveBeenCalledWith(res, 403, false, 'Anda tidak memiliki akses ke resource ini');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
