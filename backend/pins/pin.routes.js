const express = require("express");
const router = express.Router();
const controller = require("./pin.controller");

router.post("/", controller.create);
router.get("/:userId", controller.list);
router.delete("/:id", controller.remove);

module.exports = router;
