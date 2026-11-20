const { HttpError } = require("./error.middleware.cjs");

const ALLOWED_KATEGORI = ["Fasilitas", "Akademik", "TI"];
const ALLOWED_STATUS = ["diajukan", "diproses", "selesai"];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireJson(req, res, next) {
  if (!req.is("application/json")) {
    throw new HttpError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Header Content-Type harus application/json.",
    );
  }
  next();
}

function parseId(value) {
  const n = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(n)) {
    throw new HttpError(
      400,
      "INVALID_ID",
      "ID pengaduan harus berupa bilangan bulat positif.",
    );
  }
  return n;
}

function validateLoginBody(req, res, next) {
  const body = req.body;
  if (!isPlainObject(body)) {
    throw new HttpError(
      400,
      "INVALID_LOGIN",
      "Body login harus berupa objek JSON.",
    );
  }

  const keys = Object.keys(body);
  if (keys.some((k) => !["username", "password"].includes(k))) {
    throw new HttpError(
      400,
      "INVALID_LOGIN",
      "Field selain username dan password tidak diperbolehkan.",
    );
  }

  if (
    typeof body.username !== "string" ||
    !body.username.trim() ||
    typeof body.password !== "string" ||
    !body.password
  ) {
    throw new HttpError(
      400,
      "INVALID_LOGIN",
      "Username dan password wajib diisi.",
    );
  }

  req.validatedBody = {
    username: body.username.trim(),
    password: body.password,
  };
  next();
}

function validatePengaduanBody(req, res, next) {
  const body = req.body;
  if (!isPlainObject(body)) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "Body pengaduan harus berupa objek JSON.",
    );
  }

  const allowedFields = ["judul", "kategori", "deskripsi"];
  if (Object.keys(body).some((k) => !allowedFields.includes(k))) {
    throw new HttpError(
      400,
      "INVALID_FIELD",
      "Hanya field judul, kategori, dan deskripsi yang diperbolehkan.",
    );
  }

  if (
    typeof body.judul !== "string" ||
    !body.judul.trim() ||
    body.judul.trim().length > 120
  ) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "Field judul wajib diisi (maksimal 120 karakter).",
    );
  }

  if (
    typeof body.kategori !== "string" ||
    !ALLOWED_KATEGORI.includes(body.kategori)
  ) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "Field kategori harus salah satu dari: Fasilitas, Akademik, atau TI.",
    );
  }

  if (
    typeof body.deskripsi !== "string" ||
    !body.deskripsi.trim() ||
    body.deskripsi.trim().length > 1000
  ) {
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "Field deskripsi wajib diisi (maksimal 1000 karakter).",
    );
  }

  req.validatedBody = {
    judul: body.judul.trim(),
    kategori: body.kategori,
    deskripsi: body.deskripsi.trim(),
  };
  next();
}

function validateStatusBody(req, res, next) {
  const body = req.body;
  if (!isPlainObject(body)) {
    throw new HttpError(400, "INVALID_INPUT", "Body harus berupa objek JSON.");
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "status") {
    throw new HttpError(
      400,
      "INVALID_FIELD",
      "Hanya field status yang diperbolehkan.",
    );
  }

  if (
    typeof body.status !== "string" ||
    !ALLOWED_STATUS.includes(body.status)
  ) {
    throw new HttpError(
      400,
      "INVALID_STATUS",
      "Field status harus salah satu dari: diajukan, diproses, atau selesai.",
    );
  }

  req.validatedBody = { status: body.status };
  next();
}

module.exports = {
  ALLOWED_KATEGORI,
  ALLOWED_STATUS,
  requireJson,
  parseId,
  validateLoginBody,
  validatePengaduanBody,
  validateStatusBody,
};
