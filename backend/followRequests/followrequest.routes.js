const express = require("express");
const router = express.Router();
const controller = require("./followrequest.controller");

// create a follow request
router.post("/", controller.create);

// get requests for a user
router.get("/target/:userId", controller.getForUser);

// get requests for a user
router.get("/source/:userId", controller.getSentForUser);

// update status (accept/reject)
router.put("/:id/status", controller.updateStatus);

// delete a request
router.delete("/:id", controller.remove);

module.exports = router;
