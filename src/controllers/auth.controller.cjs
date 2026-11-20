const authService = require("../services/auth.service.cjs");

function login(req, res) {
  const session = authService.login(req.validatedBody);
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    success: true,
    data: session,
  });
}

module.exports = { login };
