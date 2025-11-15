const FollowRequest = require("./followrequest.model");

async function createFollowRequest(requesterId, targetId) {
  // Prevent duplicate requests
  const existing = await FollowRequest.findOne({ requesterId, targetId });
  if (existing) throw new Error("Follow request already exists");

  const request = await FollowRequest.create({ requesterId, targetId });
  return request;
}

async function getFollowRequestsForUser(userId) {
  return FollowRequest.find({ targetId: userId }).sort({ createdAt: -1 });
}

async function getFollowRequestsByRequester(userId) {
  return FollowRequest.find({ requesterId: userId }).sort({ createdAt: -1 });
}

async function updateFollowRequestStatus(id, status) {
  const request = await FollowRequest.findById(id);
  if (!request) throw new Error("Follow request not found");

  request.status = status;
  await request.save();
  return request;
}

async function deleteFollowRequest(id) {
  return FollowRequest.findByIdAndDelete(id);
}

module.exports = {
  createFollowRequest,
  getFollowRequestsForUser,
  getFollowRequestsByRequester,
  updateFollowRequestStatus,
  deleteFollowRequest,
};
