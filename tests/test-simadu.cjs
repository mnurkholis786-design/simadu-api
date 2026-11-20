// Skrip pengujian otomatis SIMADU API (HTTP Client berbasis fetch bawaan Node.js 24)
// Jalankan dengan: npm test (pastikan server sudah aktif lewat npm start)

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const results = [];

async function request(method, path, body, token) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });

  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return {
    status: res.status,
    location: res.headers.get("location"),
    json,
  };
}

function sanitizeResponse(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const copy = JSON.parse(JSON.stringify(payload));
  if (copy.data && typeof copy.data === "object" && copy.data.access_token) {
    copy.data.access_token = "[REDACTED]";
  }
  return copy;
}

function record(
  no,
  label,
  method,
  path,
  actualStatus,
  expectedStatus,
  payload,
  extraOk = true,
) {
  const pass = actualStatus === expectedStatus && extraOk;
  results.push({ no, label, pass });

  const tag = pass ? "PASS" : "FAIL";
  const num = String(no).padStart(2, "0");
  const safeBody =
    payload === null
      ? "(tanpa body)"
      : JSON.stringify(sanitizeResponse(payload));
  const preview =
    safeBody.length > 130 ? `${safeBody.slice(0, 130)}...` : safeBody;

  console.log(`[${tag}] #${num} ${label}`);
  console.log(
    `       ${method} ${path} -> Status ${actualStatus} (harapan ${expectedStatus})`,
  );
  console.log(`       Respons: ${preview}`);
}

async function run() {
  console.log("=== PENGUJIAN FUNGSIONAL & KEAMANAN SIMADU API ===\n");

  // 1. Login kredensial benar (Mahasiswa 1)
  const loginMhs1 = await request("POST", "/api/auth/login", {
    username: "mhs1",
    password: process.env.MHS1_PASSWORD,
  });
  const mhs1Token = loginMhs1.json?.data?.access_token;
  record(
    1,
    "Login dengan kredensial benar (mhs1)",
    "POST",
    "/api/auth/login",
    loginMhs1.status,
    200,
    loginMhs1.json,
    Boolean(mhs1Token),
  );

  // Login admin untuk skenario admin (tanpa cetak token)
  const loginAdmin = await request("POST", "/api/auth/login", {
    username: "admin",
    password: process.env.ADMIN_PASSWORD,
  });
  const adminToken = loginAdmin.json?.data?.access_token;
  if (!mhs1Token || !adminToken) {
    throw new Error(
      "Login gagal. Pastikan server aktif dan file .env sudah terisi benar.",
    );
  }

  // 2. Login dengan password salah
  const badLogin = await request("POST", "/api/auth/login", {
    username: "mhs1",
    password: "PasswordSalahBanget123",
  });
  record(
    2,
    "Login dengan password salah",
    "POST",
    "/api/auth/login",
    badLogin.status,
    401,
    badLogin.json,
  );

  // 3. Akses endpoint terlindungi tanpa token
  const noToken = await request("GET", "/api/pengaduan");
  record(
    3,
    "Akses endpoint terlindungi tanpa token",
    "GET",
    "/api/pengaduan",
    noToken.status,
    401,
    noToken.json,
  );

  // 4. Akses menggunakan token tidak valid
  const invalidToken = await request(
    "GET",
    "/api/pengaduan",
    undefined,
    "token-palsu-tidak-sah-12345",
  );
  record(
    4,
    "Akses menggunakan token tidak valid",
    "GET",
    "/api/pengaduan",
    invalidToken.status,
    401,
    invalidToken.json,
  );

  // 5. Mahasiswa membuat pengaduan valid
  const created = await request(
    "POST",
    "/api/pengaduan",
    {
      judul: "Proyektor Lab Jaringan Tidak Menyala",
      kategori: "Fasilitas",
      deskripsi:
        "Proyektor di Lab Jaringan lantai 2 tidak menampilkan tampilan HDMI.",
    },
    mhs1Token,
  );
  const createdId = created.json?.data?.id;
  record(
    5,
    "Mahasiswa membuat pengaduan valid",
    "POST",
    "/api/pengaduan",
    created.status,
    201,
    created.json,
    Boolean(createdId) &&
      created.json?.data?.mahasiswaId === "MHS-001" &&
      created.json?.data?.status === "diajukan",
  );

  // 6. Mahasiswa membaca pengaduan sendiri
  const readOwn = await request(
    "GET",
    `/api/pengaduan/${createdId}`,
    undefined,
    mhs1Token,
  );
  record(
    6,
    "Mahasiswa membaca pengaduan sendiri",
    "GET",
    `/api/pengaduan/${createdId}`,
    readOwn.status,
    200,
    readOwn.json,
  );

  // 7. Mahasiswa mencoba membaca pengaduan orang lain (id=2 milik MHS-002)
  const readOther = await request(
    "GET",
    "/api/pengaduan/2",
    undefined,
    mhs1Token,
  );
  record(
    7,
    "Mahasiswa membaca pengaduan orang lain",
    "GET",
    "/api/pengaduan/2",
    readOther.status,
    403,
    readOther.json,
  );

  // 8. Mahasiswa mencoba mengubah status pengaduan
  const mhsPatch = await request(
    "PATCH",
    `/api/pengaduan/${createdId}/status`,
    { status: "selesai" },
    mhs1Token,
  );
  record(
    8,
    "Mahasiswa mengubah status pengaduan",
    "PATCH",
    `/api/pengaduan/${createdId}/status`,
    mhsPatch.status,
    403,
    mhsPatch.json,
  );

  // 9. Admin melihat seluruh pengaduan
  const adminListBefore = await request(
    "GET",
    "/api/pengaduan",
    undefined,
    adminToken,
  );
  const totalBeforeInvalid = Array.isArray(adminListBefore.json?.data)
    ? adminListBefore.json.data.length
    : 0;
  const hasMultipleOwners =
    Array.isArray(adminListBefore.json?.data) &&
    adminListBefore.json.data.some((p) => p.mahasiswaId === "MHS-001") &&
    adminListBefore.json.data.some((p) => p.mahasiswaId === "MHS-002");
  record(
    9,
    "Admin melihat seluruh pengaduan",
    "GET",
    "/api/pengaduan",
    adminListBefore.status,
    200,
    {
      success: true,
      total_pengaduan: totalBeforeInvalid,
    },
    hasMultipleOwners,
  );

  // 10. Admin memperbarui status pengaduan
  const adminPatch = await request(
    "PATCH",
    `/api/pengaduan/${createdId}/status`,
    { status: "diproses" },
    adminToken,
  );
  record(
    10,
    "Admin memperbarui status pengaduan",
    "PATCH",
    `/api/pengaduan/${createdId}/status`,
    adminPatch.status,
    200,
    adminPatch.json,
    adminPatch.json?.data?.status === "diproses" &&
      adminPatch.json?.data?.mahasiswaId === "MHS-001",
  );

  // 11. Membuat pengaduan dengan field wajib kosong
  const emptyField = await request(
    "POST",
    "/api/pengaduan",
    {
      judul: "   ",
      kategori: "TI",
      deskripsi: "Deskripsi ada tetapi judul kosong.",
    },
    mhs1Token,
  );
  record(
    11,
    "Membuat pengaduan dengan field wajib kosong",
    "POST",
    "/api/pengaduan",
    emptyField.status,
    400,
    emptyField.json,
  );

  // 12. Mengakses ID pengaduan yang tidak ditemukan
  const notFound = await request(
    "GET",
    "/api/pengaduan/9999",
    undefined,
    mhs1Token,
  );
  record(
    12,
    "Mengakses ID pengaduan yang tidak ditemukan",
    "GET",
    "/api/pengaduan/9999",
    notFound.status,
    404,
    notFound.json,
  );

  // --- Skenario Tambahan (Aturan Bisnis & Integritas Data) ---

  // 13. Menyisipkan field terlarang (mahasiswaId) saat POST
  const illegalField = await request(
    "POST",
    "/api/pengaduan",
    {
      judul: "Uji Manipulasi Pemilik",
      kategori: "TI",
      deskripsi: "Mencoba memalsukan mahasiswaId.",
      mahasiswaId: "MHS-002",
    },
    mhs1Token,
  );
  record(
    13,
    "Menyisipkan field ilegal (mahasiswaId) saat POST",
    "POST",
    "/api/pengaduan",
    illegalField.status,
    400,
    illegalField.json,
  );

  // 14. Mahasiswa mencoba mengubah pengaduan yang statusnya sudah diproses
  const editProcessed = await request(
    "PUT",
    `/api/pengaduan/${createdId}`,
    {
      judul: "Coba Ubah Saat Diproses",
      kategori: "Fasilitas",
      deskripsi: "Seharusnya ditolak 403.",
    },
    mhs1Token,
  );
  record(
    14,
    "Mahasiswa mengubah pengaduan berstatus diproses",
    "PUT",
    `/api/pengaduan/${createdId}`,
    editProcessed.status,
    403,
    editProcessed.json,
  );

  // 15 & 16. Mahasiswa mengubah (PUT) lalu menghapus (DELETE) pengaduan sendiri berstatus diajukan
  const tempCreated = await request(
    "POST",
    "/api/pengaduan",
    {
      judul: "Draft Pengaduan Sementara",
      kategori: "Akademik",
      deskripsi: "Untuk uji PUT dan DELETE.",
    },
    mhs1Token,
  );
  const tempId = tempCreated.json?.data?.id;

  const editDiajukan = await request(
    "PUT",
    `/api/pengaduan/${tempId}`,
    {
      judul: "Revisi Pengaduan Sementara",
      kategori: "Akademik",
      deskripsi: "Berhasil diubah selama status diajukan.",
    },
    mhs1Token,
  );
  record(
    15,
    "Mahasiswa mengubah pengaduan sendiri (status diajukan)",
    "PUT",
    `/api/pengaduan/${tempId}`,
    editDiajukan.status,
    200,
    editDiajukan.json,
  );

  const deleteDiajukan = await request(
    "DELETE",
    `/api/pengaduan/${tempId}`,
    undefined,
    mhs1Token,
  );
  record(
    16,
    "Mahasiswa menghapus pengaduan sendiri (status diajukan)",
    "DELETE",
    `/api/pengaduan/${tempId}`,
    deleteDiajukan.status,
    204,
    deleteDiajukan.json,
  );

  // 17. Admin dilarang membuat pengaduan + bukti data tidak bertambah akibat request ditolak
  const adminCreate = await request(
    "POST",
    "/api/pengaduan",
    {
      judul: "Admin Coba Buat Pengaduan",
      kategori: "TI",
      deskripsi: "Seharusnya ditolak 403.",
    },
    adminToken,
  );
  const adminListAfter = await request(
    "GET",
    "/api/pengaduan",
    undefined,
    adminToken,
  );
  const totalAfterInvalid = Array.isArray(adminListAfter.json?.data)
    ? adminListAfter.json.data.length
    : -1;
  record(
    17,
    "Admin ditolak membuat pengaduan & jumlah data tetap utuh",
    "POST",
    "/api/pengaduan",
    adminCreate.status,
    403,
    {
      ...adminCreate.json,
      verifikasi_jumlah_data: `${totalBeforeInvalid} -> ${totalAfterInvalid}`,
    },
    totalBeforeInvalid === totalAfterInvalid,
  );

  const passedCount = results.filter((r) => r.pass).length;
  console.log(
    `\n=== RINGKASAN HASIL: ${passedCount}/${results.length} SKENARIO LULUS ===`,
  );
  if (passedCount !== results.length) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error("PENGUJIAN GAGAL:", err.message);
  process.exitCode = 1;
});
