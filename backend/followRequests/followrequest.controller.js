const followRequestService = require("./followrequest.service");
const { toRequestDTO, toRequestListDTO } = require('./followrequest.dto');
const userService = require("../users/user.service");

async function create(req, res) {
  try {
    const { requesterId, targetId } = req.body;
    const request = await followRequestService.createFollowRequest(requesterId, targetId);
    // notify target in real time
    const io = req.app.get("io");
    if (io) {
      io.to(String(targetId)).emit("follow-request", toRequestDTO(request));
    }
    res.status(201).json({request: toRequestDTO(request)});
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getForUser(req, res) {
  try {
    const userId = req.params.userId;
    const requests = await followRequestService.getFollowRequestsForUser(userId);
    res.json({requests: toRequestListDTO(requests)});
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getSentForUser(req, res) {
  try {
    const userId = req.params.userId;
    const requests = await followRequestService.getFollowRequestsByRequester(userId);
    res.json({requests: toRequestListDTO(requests)});
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function updateStatus(req, res) {
  try {
    const id = req.params.id;
    const { status } = req.body;
    if (status === "rejected") {
      // Delete the request so it can be sent again later
      const deleted = await followRequestService.deleteFollowRequest(id);
      const io = req.app.get("io");
      if (io && deleted) {
        const target = await userService.getUserById(deleted.targetId);
        io.to(String(deleted.requesterId)).emit("follow-request-rejected", {
          request: toRequestDTO(deleted),
          rejectedByEmail: target?.email,
        });
      }
      return res.json({ request: deleted ? toRequestDTO(deleted) : null });
    } else {
      const updated = await followRequestService.updateFollowRequestStatus(id, status);
      // notify requester on accept
      if (status === "accepted") {
        const io = req.app.get("io");
        if (io) {
          const target = await userService.getUserById(updated.targetId);
          io.to(String(updated.requesterId)).emit("follow-request-accepted", {
            request: toRequestDTO(updated),
            acceptedByEmail: target?.email,
          });
        }
        // Remove accepted request to clean up pending lists
        await followRequestService.deleteFollowRequest(id);
      }
      res.json({request: toRequestDTO(updated)});
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remove(req, res) {
  try {
    const id = req.params.id;
    await followRequestService.deleteFollowRequest(id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = { create, getForUser, getSentForUser, updateStatus, remove };
