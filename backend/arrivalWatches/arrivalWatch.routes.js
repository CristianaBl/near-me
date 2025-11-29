const express = require("express");
const router = express.Router();
const controller = require("./arrivalWatch.controller");

router.post("/", controller.create);
router.get("/:viewerId", controller.list);
router.delete("/:id", controller.remove);

module.exports = router;
