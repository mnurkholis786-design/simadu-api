const pengaduanService = require("../services/pengaduan.service.cjs");

function list(req, res) {
  const data = pengaduanService.listPengaduan(req.user);
  res.status(200).json({ success: true, data });
}

function detail(req, res) {
  const data = pengaduanService.getDetailPengaduan(req.pengaduanId, req.user);
  res.status(200).json({ success: true, data });
}

function create(req, res) {
  const item = pengaduanService.createPengaduan(req.validatedBody, req.user);
  res.location(`/api/pengaduan/${item.id}`);
  res.status(201).json({ success: true, data: item });
}

function update(req, res) {
  const item = pengaduanService.updatePengaduan(
    req.pengaduanId,
    req.validatedBody,
    req.user,
  );
  res.status(200).json({ success: true, data: item });
}

function updateStatus(req, res) {
  const item = pengaduanService.updateStatusPengaduan(
    req.pengaduanId,
    req.validatedBody.status,
  );
  res.status(200).json({ success: true, data: item });
}

function remove(req, res) {
  pengaduanService.deletePengaduan(req.pengaduanId, req.user);
  res.status(204).end();
}

module.exports = {
  list,
  detail,
  create,
  update,
  updateStatus,
  remove,
};
