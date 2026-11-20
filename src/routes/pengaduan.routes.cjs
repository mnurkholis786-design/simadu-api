const express = require("express");
const {
  requireAuth,
  requireRole,
} = require("../middleware/auth.middleware.cjs");
const {
  requireJson,
  parseId,
  validatePengaduanBody,
  validateStatusBody,
} = require("../middleware/validate.middleware.cjs");
const pengaduanController = require("../controllers/pengaduan.controller.cjs");

const router = express.Router();

// Semua endpoint /api/pengaduan wajib terautentikasi
router.use(requireAuth);

router.param("id", (req, res, next, value) => {
  req.pengaduanId = parseId(value);
  next();
});

router.get("/", requireRole("mahasiswa", "admin"), pengaduanController.list);
router.get(
  "/:id",
  requireRole("mahasiswa", "admin"),
  pengaduanController.detail,
);
router.post(
  "/",
  requireRole("mahasiswa"),
  requireJson,
  validatePengaduanBody,
  pengaduanController.create,
);
router.put(
  "/:id",
  requireRole("mahasiswa"),
  requireJson,
  validatePengaduanBody,
  pengaduanController.update,
);
router.patch(
  "/:id/status",
  requireRole("admin"),
  requireJson,
  validateStatusBody,
  pengaduanController.updateStatus,
);
router.delete("/:id", requireRole("mahasiswa"), pengaduanController.remove);

module.exports = router;
