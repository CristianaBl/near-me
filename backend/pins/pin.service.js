const Pin = require("./pin.model");

async function createPin(userId, category, latitude, longitude, title) {
  return Pin.create({ userId, category, latitude, longitude, title });
}

async function getPinsForUser(userId) {
  return Pin.find({ userId }).sort({ createdAt: -1 });
}

async function deletePin(id, userId) {
  return Pin.findOneAndDelete({ _id: id, userId });
}

module.exports = { createPin, getPinsForUser, deletePin };
