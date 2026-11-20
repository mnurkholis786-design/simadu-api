const express = require("express");
const {
  requireJson,
  validateLoginBody,
} = require("../middleware/validate.middleware.cjs");
const authController = require("../controllers/auth.controller.cjs");

const router = express.Router();

router.post("/login", requireJson, validateLoginBody, authController.login);

module.exports = router;
