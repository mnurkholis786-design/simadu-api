const app = require("./app.cjs");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`SIMADU API berjalan di http://localhost:${PORT}`);
  console.log(`Dokumentasi Swagger UI: http://localhost:${PORT}/docs`);
});
