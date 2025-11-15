const subscriptionService = require("./subscription.service");

async function create(req, res) {
  try {
    const { viewerId, targetId } = req.body;
    const sub = await subscriptionService.createSubscription(viewerId, targetId);
    res.status(201).json(sub);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getForViewer(req, res) {
  try {
    const viewerId = req.params.viewerId;
    const subs = await subscriptionService.getSubscriptionsForViewer(viewerId);
    res.json(subs);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getForTarget(req, res) {
  try {
    const targetId = req.params.targetId;
    const subs = await subscriptionService.getSubscriptionsForTarget(targetId);
    res.json(subs);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remove(req, res) {
  try {
    const id = req.params.id;
    await subscriptionService.removeSubscription(id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = { create, getForViewer, getForTarget, remove };
