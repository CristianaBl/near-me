const express = require("express");
const controller = require("./pushToken.controller");
const router = express.Router();

router.post("/", controller.register);
router.delete("/", controller.remove);

module.exports = router;
