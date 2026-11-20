const pengaduanRepository = require("../repositories/pengaduan.repository.cjs");
const { HttpError } = require("../middleware/error.middleware.cjs");

function listPengaduan(user) {
  if (user.role === "admin") {
    return pengaduanRepository.findAll();
  }
  return pengaduanRepository.findByMahasiswaId(user.id);
}

function getDetailPengaduan(id, user) {
  const item = pengaduanRepository.findById(id);
  if (!item) {
    throw new HttpError(
      404,
      "PENGADUAN_NOT_FOUND",
      "Pengaduan tidak ditemukan.",
    );
  }

  if (user.role !== "admin" && item.mahasiswaId !== user.id) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Anda tidak berhak mengakses pengaduan milik mahasiswa lain.",
    );
  }

  return item;
}

function createPengaduan(input, user) {
  return pengaduanRepository.create({
    mahasiswaId: user.id,
    judul: input.judul,
    kategori: input.kategori,
    deskripsi: input.deskripsi,
  });
}

function updatePengaduan(id, input, user) {
  const item = pengaduanRepository.findById(id);
  if (!item) {
    throw new HttpError(
      404,
      "PENGADUAN_NOT_FOUND",
      "Pengaduan tidak ditemukan.",
    );
  }

  if (item.mahasiswaId !== user.id) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Anda hanya dapat mengubah pengaduan milik sendiri.",
    );
  }

  if (item.status !== "diajukan") {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Pengaduan hanya dapat diubah selama berstatus diajukan.",
    );
  }

  return pengaduanRepository.updateContent(id, input);
}

function updateStatusPengaduan(id, status) {
  const item = pengaduanRepository.findById(id);
  if (!item) {
    throw new HttpError(
      404,
      "PENGADUAN_NOT_FOUND",
      "Pengaduan tidak ditemukan.",
    );
  }

  return pengaduanRepository.updateStatus(id, status);
}

function deletePengaduan(id, user) {
  const item = pengaduanRepository.findById(id);
  if (!item) {
    throw new HttpError(
      404,
      "PENGADUAN_NOT_FOUND",
      "Pengaduan tidak ditemukan.",
    );
  }

  if (item.mahasiswaId !== user.id) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Anda hanya dapat menghapus pengaduan milik sendiri.",
    );
  }

  if (item.status !== "diajukan") {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Pengaduan hanya dapat dihapus selama berstatus diajukan.",
    );
  }

  pengaduanRepository.remove(id);
}

module.exports = {
  listPengaduan,
  getDetailPengaduan,
  createPengaduan,
  updatePengaduan,
  updateStatusPengaduan,
  deletePengaduan,
};
