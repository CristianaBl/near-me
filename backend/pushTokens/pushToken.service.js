const PushToken = require("./pushToken.model");

async function upsertToken(userId, token) {
  if (!userId || !token) throw new Error("userId and token are required");
  const existing = await PushToken.findOne({ token });
  if (existing) {
    if (String(existing.userId) !== String(userId)) {
      existing.userId = userId;
      await existing.save();
    }
    return existing;
  }
  return PushToken.create({ userId, token });
}

async function getTokensForUser(userId) {
  return PushToken.find({ userId });
}

async function removeToken(token) {
  return PushToken.findOneAndDelete({ token });
}

module.exports = {
  upsertToken,
  getTokensForUser,
  removeToken,
};
