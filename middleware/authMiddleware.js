const jwt = require('jsonwebtoken');
const { sendResponse } = require('../helpers/response');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendResponse(res, 401, false, 'Token tidak ditemukan, silakan login');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return sendResponse(res, 403, false, 'Token tidak valid atau sudah expired');
    }
    req.user = decoded;
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.nama_role)) {
      return sendResponse(res, 403, false, 'Anda tidak memiliki akses ke resource ini');
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
