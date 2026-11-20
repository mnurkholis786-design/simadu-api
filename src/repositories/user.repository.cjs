const crypto = require('node:crypto');

const sessions = new Map();

function digestToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function initUsers() {
  const required = ['ADMIN_PASSWORD', 'MHS1_PASSWORD', 'MHS2_PASSWORD'];
  for (const key of required) {
    if (!process.env[key] || process.env[key].length < 12) {
      throw new Error(`Variabel ${key} wajib diisi minimal 12 karakter di file .env`);
    }
  }

  const seed = [
    { id: 'ADM-001', username: 'admin', role: 'admin', password: process.env.ADMIN_PASSWORD },
    { id: 'MHS-001', username: 'mhs1', role: 'mahasiswa', password: process.env.MHS1_PASSWORD },
    { id: 'MHS-002', username: 'mhs2', role: 'mahasiswa', password: process.env.MHS2_PASSWORD }
  ];

  return seed.map((u) => {
    const { salt, hash } = hashPassword(u.password);
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      salt,
      passwordHash: hash
    };
  });
}

const users = initUsers();

function getTtlMs() {
  const minutes = Number(process.env.TOKEN_TTL_MINUTES) || 30;
  return minutes * 60 * 1000;
}

function findByUsername(username) {
  return users.find((u) => u.username === username) || null;
}

function createSession(user) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const ttlMs = getTtlMs();
  const expiresAt = Date.now() + ttlMs;

  sessions.set(digestToken(rawToken), {
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt
  });

  return {
    access_token: rawToken,
    token_type: 'Bearer',
    expires_in: Math.floor(ttlMs / 1000),
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  };
}

function findSessionByToken(rawToken) {
  const hashed = digestToken(rawToken);
  const session = sessions.get(hashed);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(hashed);
    return null;
  }

  return session;
}

module.exports = {
  findByUsername,
  createSession,
  findSessionByToken
};