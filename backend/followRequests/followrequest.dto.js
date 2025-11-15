function toRequestDTO(followRequest) {
  if (!followRequest) return null;
  return {
    id: followRequest._id,
    requesterId: followRequest.requesterId,
    targetId: followRequest.targetId,
    status: followRequest.status,
    createdAt: followRequest.createdAt
  };
}

function toRequestListDTO(followRequests) {
  return followRequests.map(toRequestDTO);
}

module.exports = { toRequestDTO, toRequestListDTO };
