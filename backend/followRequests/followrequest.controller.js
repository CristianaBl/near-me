const followRequestService = require("./followrequest.service");
const { toRequestDTO, toRequestListDTO } = require('./followrequest.dto');

async function create(req, res) {
  try {
    const { requesterId, targetId } = req.body;
    const request = await followRequestService.createFollowRequest(requesterId, targetId);
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
    const updated = await followRequestService.updateFollowRequestStatus(id, status);
    res.json({request: toRequestDTO(updated)});
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
