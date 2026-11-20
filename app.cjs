const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const authRoutes = require("./src/routes/auth.routes.cjs");
const pengaduanRoutes = require("./src/routes/pengaduan.routes.cjs");
const {
  HttpError,
  notFoundHandler,
  errorHandler,
} = require("./src/middleware/error.middleware.cjs");

const app = express();

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  next();
});

app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: "ok", service: "SIMADU API" },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/pengaduan", pengaduanRoutes);

app.get("/openapi.json", (req, res) => {
  const specPath = path.resolve(__dirname, "docs", "openapi.json");
  if (!fs.existsSync(specPath)) {
    throw new HttpError(
      503,
      "DOCS_NOT_READY",
      "Dokumentasi belum dibuat. Jalankan npm run docs.",
    );
  }
  res.type("application/json").sendFile(specPath);
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: "/openapi.json",
      validatorUrl: null,
      persistAuthorization: false,
    },
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
