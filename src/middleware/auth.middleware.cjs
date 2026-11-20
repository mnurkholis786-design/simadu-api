const { HttpError } = require('./error.middleware.cjs');
const userRepository = require('../repositories/user.repository.cjs');

function requireAuth(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const match = /^Bearer (.+)$/i.exec(authorization.trim());

  if (!match) {
    res.set('WWW-Authenticate', 'Bearer');
    throw new HttpError(401, 'TOKEN_REQUIRED', 'Bearer token wajib disertakan.');
  }

  const session = userRepository.findSessionByToken(match[1]);
  if (!session) {
    res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
    throw new HttpError(401, 'INVALID_TOKEN', 'Token tidak valid atau sudah kedaluwarsa.');
  }

  req.user = {
    id: session.userId,
    username: session.username,
    role: session.role
  };
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki hak akses untuk operasi ini.');
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };