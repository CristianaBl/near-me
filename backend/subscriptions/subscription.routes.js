const express = require("express");
const router = express.Router();
const controller = require("./subscription.controller");

// create subscription
router.post("/", controller.create);

// get subscriptions for viewer
router.get("/viewer/:viewerId", controller.getForViewer);

// get subscriptions for target
router.get("/target/:targetId", controller.getForTarget);

// delete subscription
router.delete("/:id", controller.remove);

// delete subscription by viewer/target pair
router.delete("/", controller.removeByUsers);

// toggle subscription enabled
router.put("/enabled", controller.setEnabled);

module.exports = router;
