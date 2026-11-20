# SIMADU API — Sistem Layanan Informasi dan Pengaduan Mahasiswa

REST API berlapis berbasis **Node.js** dan **Express 5** untuk layanan pengaduan mahasiswa (fasilitas, akademik, dan TI) dengan autentikasi **Bearer Token** berkedaluwarsa, penyimpanan password ter-hash (`scrypt`), **Role-Based Access Control (RBAC)**, serta **Object-Level Authorization** (pembatasan kepemilikan data).

## 1. Prasyarat

- Node.js v20.6+ (direkomendasikan v24 LTS)
- npm v10+
- Git

## 2. Instalasi & Konfigurasi

1. Clone repositori dan masuk ke folder proyek:

   git clone https://github.com/mnurkholis786-design/simadu-api.git
   cd simadu-api

2. Instal dependensi:

   npm install

3. Salin `.env.example` menjadi `.env`:

   cp .env.example .env

4. Isi nilai password (minimal 12 karakter) pada `.env`:

   PORT=3000
   TOKEN_TTL_MINUTES=30
   ADMIN_PASSWORD=ganti_password_admin_minimal_12
   MHS1_PASSWORD=ganti_password_mhs1_minimal_12
   MHS2_PASSWORD=ganti_password_mhs2_minimal_12

Catatan: Jangan pernah mengunggah file `.env` ke repositori Git.

## 3. Cara Menjalankan Server & Pengujian

1. Generate spesifikasi OpenAPI (`docs/openapi.json`):

   npm run docs

2. Jalankan server API:

   npm start

- Base URL: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

3. Jalankan pengujian otomatis (di terminal terpisah saat server aktif):

   npm test

## 4. Arsitektur Berlapis (`src/`)

- `src/routes/`: Memetakan metode HTTP dan path URL ke middleware dan controller.
- `src/middleware/`: Memverifikasi Bearer token, mengecek role, memvalidasi input JSON/ID, dan menangani error terpusat.
- `src/controllers/`: Menerima permintaan HTTP tervalidasi, memanggil service, dan mengirim respons JSON konsisten.
- `src/services/`: Menjalankan aturan bisnis (verifikasi hash password `scrypt`, pengecekan kepemilikan data, dan aturan status `diajukan`).
- `src/repositories/`: Mengelola data akun, sesi token (hash SHA-256 berkedaluwarsa), dan data pengaduan di memori.

## 5. Kontrak Endpoint & Hak Akses

| Metode | Endpoint                  | Autentikasi  |        Mahasiswa         |     Admin     | Status Sukses |
| :----- | :------------------------ | :----------: | :----------------------: | :-----------: | :-----------: |
| GET    | /health                   |    Publik    |            Ya            |      Ya       |      200      |
| POST   | /api/auth/login           |    Publik    |            Ya            |      Ya       |      200      |
| GET    | /api/pengaduan            | Bearer Token |      Milik sendiri       |     Semua     |      200      |
| GET    | /api/pengaduan/:id        | Bearer Token |      Milik sendiri       |     Semua     |      200      |
| POST   | /api/pengaduan            | Bearer Token |            Ya            | Ditolak (403) |      201      |
| PUT    | /api/pengaduan/:id        | Bearer Token | Milik sendiri (diajukan) | Ditolak (403) |      200      |
| PATCH  | /api/pengaduan/:id/status | Bearer Token |      Ditolak (403)       |      Ya       |      200      |
| DELETE | /api/pengaduan/:id        | Bearer Token | Milik sendiri (diajukan) | Ditolak (403) |      204      |

Akun uji awal (password diatur di `.env`):

- Admin: `admin` (`ADM-001`)
- Mahasiswa 1: `mhs1` (`MHS-001`)
- Mahasiswa 2: `mhs2` (`MHS-002`)

## 6. Contoh Request & Response JSON

Login (`POST /api/auth/login`) - Request:

    {
      "username": "mhs1",
      "password": "<MHS1_PASSWORD>"
    }

Login - Response (`200 OK`):

    {
      "success": true,
      "data": {
        "access_token": "<token_acak_64_hex>",
        "token_type": "Bearer",
        "expires_in": 1800,
        "user": {
          "id": "MHS-001",
          "username": "mhs1",
          "role": "mahasiswa"
        }
      }
    }

Tambah Pengaduan (`POST /api/pengaduan`) - Request:

    {
      "judul": "Proyektor Lab Jaringan Tidak Menyala",
      "kategori": "Fasilitas",
      "deskripsi": "Proyektor di Lab Jaringan lantai 2 tidak menampilkan tampilan HDMI."
    }

Tambah Pengaduan - Response (`201 Created`):

    {
      "success": true,
      "data": {
        "id": 4,
        "mahasiswaId": "MHS-001",
        "judul": "Proyektor Lab Jaringan Tidak Menyala",
        "kategori": "Fasilitas",
        "deskripsi": "Proyektor di Lab Jaringan lantai 2 tidak menampilkan tampilan HDMI.",
        "status": "diajukan",
        "createdAt": "2026-11-19T02:15:00.000Z"
      }
    }

Contoh Respons Error (`400`, `401`, `403`, `404`, `500`):

    {
      "success": false,
      "error": {
        "code": "FORBIDDEN",
        "message": "Anda tidak berhak mengakses pengaduan milik mahasiswa lain."
      }
    }
