let pengaduanList = [
  {
    id: 1,
    mahasiswaId: "MHS-001",
    judul: "AC Ruang Kuliah 3.4 Tidak Dingin",
    kategori: "Fasilitas",
    deskripsi:
      "AC di ruang 3.4 gedung FST mengeluarkan angin panas sejak pagi.",
    status: "diajukan",
    createdAt: "2026-11-18T08:00:00.000Z",
  },
  {
    id: 2,
    mahasiswaId: "MHS-002",
    judul: "WiFi Kampus Sering Putus di Perpustakaan",
    kategori: "TI",
    deskripsi:
      "Koneksi WiFi perpustakaan sering terputus saat mengunduh jurnal.",
    status: "diajukan",
    createdAt: "2026-11-18T09:30:00.000Z",
  },
  {
    id: 3,
    mahasiswaId: "MHS-001",
    judul: "Kesalahan Input Nilai Praktikum",
    kategori: "Akademik",
    deskripsi: "Nilai praktikum semester lalu belum muncul di portal akademik.",
    status: "diproses",
    createdAt: "2026-11-17T14:15:00.000Z",
  },
];

let nextId = 4;

function findAll() {
  return pengaduanList.map((item) => ({ ...item }));
}

function findByMahasiswaId(mahasiswaId) {
  return pengaduanList
    .filter((item) => item.mahasiswaId === mahasiswaId)
    .map((item) => ({ ...item }));
}

function findById(id) {
  const item = pengaduanList.find((p) => p.id === id);
  return item ? { ...item } : null;
}

function create({ mahasiswaId, judul, kategori, deskripsi }) {
  const newItem = {
    id: nextId++,
    mahasiswaId,
    judul,
    kategori,
    deskripsi,
    status: "diajukan",
    createdAt: new Date().toISOString(),
  };
  pengaduanList.push(newItem);
  return { ...newItem };
}

function updateContent(id, { judul, kategori, deskripsi }) {
  const index = pengaduanList.findIndex((p) => p.id === id);
  if (index === -1) return null;

  pengaduanList[index] = {
    ...pengaduanList[index],
    judul,
    kategori,
    deskripsi,
  };
  return { ...pengaduanList[index] };
}

function updateStatus(id, status) {
  const index = pengaduanList.findIndex((p) => p.id === id);
  if (index === -1) return null;

  pengaduanList[index] = {
    ...pengaduanList[index],
    status,
  };
  return { ...pengaduanList[index] };
}

function remove(id) {
  const index = pengaduanList.findIndex((p) => p.id === id);
  if (index === -1) return false;

  pengaduanList.splice(index, 1);
  return true;
}

module.exports = {
  findAll,
  findByMahasiswaId,
  findById,
  create,
  updateContent,
  updateStatus,
  remove,
};
