function toLocationDTO(loc) {
  const user = loc.userId;
  const userId = user && user._id ? user._id : loc.userId;
  const email = user && user.email ? user.email : undefined;
  const firstName = user && user.firstName ? user.firstName : undefined;
  const lastName = user && user.lastName ? user.lastName : undefined;

  return {
    id: loc._id,
    userId,
    email,
    firstName,
    lastName,
    latitude: loc.latitude,
    longitude: loc.longitude,
    updatedAt: loc.updatedAt,
  };
}

function toLocationListDTO(locations) {
  return locations.map(toLocationDTO);
}

module.exports = { toLocationDTO, toLocationListDTO };
