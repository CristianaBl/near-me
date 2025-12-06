const Subscription = require("./subscription.model");

async function createSubscription(viewerId, targetId) {
  const exists = await Subscription.findOne({ viewerId, targetId });
  if (exists) {
    if (!exists.enabled) {
      exists.enabled = true;
      await exists.save();
      return exists;
    }
    throw new Error("Subscription already exists");
  }

  return Subscription.create({ viewerId, targetId, enabled: true });
}

async function getSubscriptionsForViewer(viewerId) {
  return Subscription.find({
    viewerId,
    $or: [{ enabled: true }, { enabled: { $exists: false } }],
  }).sort({ createdAt: -1 });
}

async function getSubscriptionsForTarget(targetId) {
  return Subscription.find({ targetId }).sort({ createdAt: -1 });
}

async function removeSubscription(id) {
  return Subscription.findByIdAndDelete(id);
}

async function removeByUsers(viewerId, targetId) {
  return Subscription.findOneAndDelete({ viewerId, targetId });
}

async function setEnabled(viewerId, targetId, enabled) {
  return Subscription.findOneAndUpdate(
    { viewerId, targetId },
    { enabled },
    { new: true }
  );
}

module.exports = { createSubscription, getSubscriptionsForViewer, getSubscriptionsForTarget, removeSubscription, removeByUsers, setEnabled };
