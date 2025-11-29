const express = require("express");
const router = express.Router();
const controller = require("./location.controller");

// Upsert current user's location
router.put("/:userId", controller.upsert);

// Get locations for users that the viewer follows
router.get("/following/:viewerId", controller.getForViewer);

module.exports = router;
