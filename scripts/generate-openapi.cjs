const fs = require("node:fs");
const path = require("node:path");

const errorSchemaRef = { $ref: "#/components/schemas/ErrorResponse" };

const jsonContent = (schema, example) => ({
  "application/json": {
    schema,
    ...(example ? { example } : {}),
  },
});

const errorResponse = (description, code, message) => ({
  description,
  content: jsonContent(errorSchemaRef, {
    success: false,
    error: { code, message },
  }),
});

const idParam = [
  {
    name: "id",
    in: "path",
    required: true,
    description: "ID pengaduan (bilangan bulat positif)",
    schema: { type: "integer", minimum: 1, example: 1 },
  },
];

const doc = {
  openapi: "3.1.0",
  info: {
    title: "SIMADU API — Sistem Layanan Informasi dan Pengaduan Mahasiswa",
    version: "1.0.0",
    description:
      "REST API berlapis untuk layanan pengaduan mahasiswa menggunakan Node.js, Express 5, autentikasi Bearer Token berkedaluwarsa, RBAC (mahasiswa & admin), serta otorisasi tingkat objek (kepemilikan data).",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Server pengembangan lokal (127.0.0.1)",
    },
  ],
  tags: [
    { name: "System", description: "Pemeriksaan kesehatan layanan" },
    {
      name: "Auth",
      description: "Autentikasi pengguna dan penerbitan Bearer Token",
    },
    { name: "Pengaduan", description: "Pengelolaan data pengaduan mahasiswa" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "opaque",
        description:
          "Masukkan access_token hasil POST /api/auth/login (tanpa awalan kata Bearer).",
      },
    },
    schemas: {
      LoginInput: {
        type: "object",
        additionalProperties: false,
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "mhs1" },
          password: {
            type: "string",
            format: "password",
            example: "PASSWORD_DARI_ENV",
          },
        },
      },
      Pengaduan: {
        type: "object",
        required: [
          "id",
          "mahasiswaId",
          "judul",
          "kategori",
          "deskripsi",
          "status",
          "createdAt",
        ],
        properties: {
          id: { type: "integer", example: 1 },
          mahasiswaId: { type: "string", example: "MHS-001" },
          judul: {
            type: "string",
            example: "AC Ruang Kuliah 3.4 Tidak Dingin",
          },
          kategori: {
            type: "string",
            enum: ["Fasilitas", "Akademik", "TI"],
            example: "Fasilitas",
          },
          deskripsi: {
            type: "string",
            example: "AC di ruang 3.4 mengeluarkan angin panas sejak pagi.",
          },
          status: {
            type: "string",
            enum: ["diajukan", "diproses", "selesai"],
            example: "diajukan",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-11-18T08:00:00.000Z",
          },
        },
      },
      PengaduanInput: {
        type: "object",
        additionalProperties: false,
        required: ["judul", "kategori", "deskripsi"],
        properties: {
          judul: {
            type: "string",
            minLength: 1,
            maxLength: 120,
            example: "Proyektor Lab Jaringan Rusak",
          },
          kategori: {
            type: "string",
            enum: ["Fasilitas", "Akademik", "TI"],
            example: "Fasilitas",
          },
          deskripsi: {
            type: "string",
            minLength: 1,
            maxLength: 1000,
            example:
              "Proyektor di Lab Jaringan tidak menampilkan gambar saat perkuliahan.",
          },
        },
      },
      StatusInput: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["diajukan", "diproses", "selesai"],
            example: "diproses",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "FORBIDDEN" },
              message: {
                type: "string",
                example: "Anda tidak memiliki hak akses untuk operasi ini.",
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Cek status server (Publik)",
        responses: {
          200: {
            description: "Server aktif",
            content: jsonContent(
              { type: "object" },
              { success: true, data: { status: "ok", service: "SIMADU API" } },
            ),
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login pengguna (Mahasiswa / Admin)",
        description:
          "Memverifikasi username dan password hash (scrypt), lalu mengembalikan Bearer token berkedaluwarsa.",
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/LoginInput" }),
        },
        responses: {
          200: {
            description: "Login berhasil, Bearer token diterbitkan",
            content: jsonContent(
              { type: "object" },
              {
                success: true,
                data: {
                  access_token: "<token_acak_64_hex>",
                  token_type: "Bearer",
                  expires_in: 1800,
                  user: { id: "MHS-001", username: "mhs1", role: "mahasiswa" },
                },
              },
            ),
          },
          400: errorResponse(
            "Input login tidak valid",
            "INVALID_LOGIN",
            "Username dan password wajib diisi.",
          ),
          401: errorResponse(
            "Kredensial salah",
            "INVALID_CREDENTIALS",
            "Username atau password salah.",
          ),
          415: errorResponse(
            "Content-Type bukan JSON",
            "UNSUPPORTED_MEDIA_TYPE",
            "Header Content-Type harus application/json.",
          ),
        },
      },
    },
    "/api/pengaduan": {
      get: {
        tags: ["Pengaduan"],
        summary: "Mengambil daftar pengaduan sesuai hak akses",
        description:
          "Mahasiswa hanya melihat pengaduan miliknya sendiri; Admin melihat seluruh pengaduan.",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Daftar pengaduan berhasil diambil",
            content: jsonContent({
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Pengaduan" },
                },
              },
            }),
          },
          401: errorResponse(
            "Token tidak ada atau tidak valid",
            "TOKEN_REQUIRED",
            "Bearer token wajib disertakan.",
          ),
        },
      },
      post: {
        tags: ["Pengaduan"],
        summary: "Menambahkan pengaduan baru (Khusus Mahasiswa)",
        description:
          "Identitas pemilik (mahasiswaId) diambil otomatis dari token dan status awal selalu diajukan.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/PengaduanInput" }),
        },
        responses: {
          201: {
            description: "Pengaduan berhasil dibuat (disertai header Location)",
            content: jsonContent({
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: { $ref: "#/components/schemas/Pengaduan" },
              },
            }),
          },
          400: errorResponse(
            "Input tidak valid atau ada field terlarang",
            "INVALID_INPUT",
            "Field judul wajib diisi (maksimal 120 karakter).",
          ),
          401: errorResponse(
            "Tidak terautentikasi",
            "TOKEN_REQUIRED",
            "Bearer token wajib disertakan.",
          ),
          403: errorResponse(
            "Admin tidak diizinkan membuat pengaduan",
            "FORBIDDEN",
            "Anda tidak memiliki hak akses untuk operasi ini.",
          ),
          415: errorResponse(
            "Content-Type bukan JSON",
            "UNSUPPORTED_MEDIA_TYPE",
            "Header Content-Type harus application/json.",
          ),
        },
      },
    },
    "/api/pengaduan/{id}": {
      get: {
        tags: ["Pengaduan"],
        summary: "Mengambil detail pengaduan",
        description:
          "Mahasiswa hanya dapat melihat pengaduan miliknya (403 jika milik orang lain); Admin dapat melihat semua.",
        security: [{ BearerAuth: [] }],
        parameters: idParam,
        responses: {
          200: {
            description: "Detail pengaduan ditemukan",
            content: jsonContent({
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: { $ref: "#/components/schemas/Pengaduan" },
              },
            }),
          },
          400: errorResponse(
            "ID tidak valid",
            "INVALID_ID",
            "ID pengaduan harus berupa bilangan bulat positif.",
          ),
          401: errorResponse(
            "Tidak terautentikasi",
            "TOKEN_REQUIRED",
            "Bearer token wajib disertakan.",
          ),
          403: errorResponse(
            "Bukan pemilik pengaduan",
            "FORBIDDEN",
            "Anda tidak berhak mengakses pengaduan milik mahasiswa lain.",
          ),
          404: errorResponse(
            "Pengaduan tidak ditemukan",
            "PENGADUAN_NOT_FOUND",
            "Pengaduan tidak ditemukan.",
          ),
        },
      },
      put: {
        tags: ["Pengaduan"],
        summary: "Mengubah isi pengaduan sendiri (Khusus Mahasiswa)",
        description:
          "Hanya dapat mengubah judul, kategori, dan deskripsi milik sendiri selama status masih diajukan.",
        security: [{ BearerAuth: [] }],
        parameters: idParam,
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/PengaduanInput" }),
        },
        responses: {
          200: {
            description: "Pengaduan berhasil diperbarui",
            content: jsonContent({
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: { $ref: "#/components/schemas/Pengaduan" },
              },
            }),
          },
          400: errorResponse(
            "Input atau ID tidak valid",
            "INVALID_INPUT",
            "Field judul wajib diisi (maksimal 120 karakter).",
          ),
          401: errorResponse(
            "Tidak terautentikasi",
            "TOKEN_REQUIRED",
            "Bearer token wajib disertakan.",
          ),
          403: errorResponse(
            "Bukan pemilik, role admin, atau status bukan diajukan",
            "FORBIDDEN",
            "Pengaduan hanya dapat diubah selama berstatus diajukan.",
          ),
          404: errorResponse(
            "Pengaduan tidak ditemukan",
            "PENGADUAN_NOT_FOUND",
            "Pengaduan tidak ditemukan.",
          ),
        },
      },
      delete: {
        tags: ["Pengaduan"],
        summary: "Menghapus pengaduan sendiri (Khusus Mahasiswa)",
        description:
          "Hanya pemilik pengaduan yang boleh menghapus, dan hanya selama status masih diajukan.",
        security: [{ BearerAuth: [] }],
        parameters: idParam,
        responses: {
          204: { description: "Pengaduan berhasil dihapus (tanpa body)" },
          400: errorResponse(
            "ID tidak valid",
            "INVALID_ID",
            "ID pengaduan harus berupa bilangan bulat positif.",
          ),
          401: errorResponse(
            "Tidak terautentikasi",
            "TOKEN_REQUIRED",
            "Bearer token wajib disertakan.",
          ),
          403: errorResponse(
            "Bukan pemilik, role admin, atau status bukan diajukan",
            "FORBIDDEN",
            "Pengaduan hanya dapat dihapus selama berstatus diajukan.",
          ),
          404: errorResponse(
            "Pengaduan tidak ditemukan",
            "PENGADUAN_NOT_FOUND",
            "Pengaduan tidak ditemukan.",
          ),
        },
      },
    },
    "/api/pengaduan/{id}/status": {
      patch: {
        tags: ["Pengaduan"],
        summary: "Memperbarui status penanganan pengaduan (Khusus Admin)",
        description:
          "Admin hanya dapat memperbarui status menjadi diajukan, diproses, atau selesai tanpa mengubah pemilik.",
        security: [{ BearerAuth: [] }],
        parameters: idParam,
        requestBody: {
          required: true,
          content: jsonContent({ $ref: "#/components/schemas/StatusInput" }),
        },
        responses: {
          200: {
            description: "Status pengaduan berhasil diperbarui",
            content: jsonContent({
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: { $ref: "#/components/schemas/Pengaduan" },
              },
            }),
          },
          400: errorResponse(
            "Nilai status tidak valid",
            "INVALID_STATUS",
            "Field status harus salah satu dari: diajukan, diproses, atau selesai.",
          ),
          401: errorResponse(
            "Tidak terautentikasi",
            "TOKEN_REQUIRED",
            "Bearer token wajib disertakan.",
          ),
          403: errorResponse(
            "Mahasiswa dilarang mengubah status",
            "FORBIDDEN",
            "Anda tidak memiliki hak akses untuk operasi ini.",
          ),
          404: errorResponse(
            "Pengaduan tidak ditemukan",
            "PENGADUAN_NOT_FOUND",
            "Pengaduan tidak ditemukan.",
          ),
        },
      },
    },
  },
};

const docsDir = path.resolve(__dirname, "..", "docs");
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(
  path.join(docsDir, "openapi.json"),
  JSON.stringify(doc, null, 2) + "\n",
);
console.log("Dokumentasi OpenAPI berhasil dibuat: docs/openapi.json");
