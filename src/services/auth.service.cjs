const crypto = require("node:crypto");
const userRepository = require("../repositories/user.repository.cjs");
const { HttpError } = require("../middleware/error.middleware.cjs");

function verifyPassword(password, salt, expectedHex) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}

function login({ username, password }) {
  const user = userRepository.findByUsername(username);

  // Gunakan hash dummy jika user tidak ada agar waktu respon tetap konsisten
  const salt = user ? user.salt : "00000000000000000000000000000000";
  const expectedHash = user
    ? user.passwordHash
    : crypto.scryptSync("dummy-password-check", salt, 64).toString("hex");

  const valid = verifyPassword(password, salt, expectedHash);
  if (!user || !valid) {
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Username atau password salah.",
    );
  }

  return userRepository.createSession(user);
}

module.exports = { login };
