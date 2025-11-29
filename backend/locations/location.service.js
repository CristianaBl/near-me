const Location = require("./location.model");
const Subscription = require("../subscriptions/subscription.model");

async function upsertLocation(userId, latitude, longitude) {
  const updated = await Location.findOneAndUpdate(
    { userId },
    { latitude, longitude },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return updated;
}

async function getLocationsForViewer(viewerId) {
  const subs = await Subscription.find({ viewerId }).select("targetId");
  const targetIds = subs.map((s) => s.targetId);
  if (!targetIds.length) return [];

  const locations = await Location.find({ userId: { $in: targetIds } }).populate({
    path: "userId",
    select: "email firstName lastName",
  });

  return locations;
}

module.exports = { upsertLocation, getLocationsForViewer };
