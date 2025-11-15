const Subscription = require("./subscription.model");

async function createSubscription(viewerId, targetId) {
  const exists = await Subscription.findOne({ viewerId, targetId });
  if (exists) throw new Error("Subscription already exists");

  return Subscription.create({ viewerId, targetId });
}

async function getSubscriptionsForViewer(viewerId) {
  return Subscription.find({ viewerId }).sort({ createdAt: -1 });
}

async function getSubscriptionsForTarget(targetId) {
  return Subscription.find({ targetId }).sort({ createdAt: -1 });
}

async function removeSubscription(id) {
  return Subscription.findByIdAndDelete(id);
}

module.exports = { createSubscription, getSubscriptionsForViewer, getSubscriptionsForTarget, removeSubscription };
