const pinService = require("./pin.service");

async function create(req, res) {
  try {
    const { userId, category, latitude, longitude, title } = req.body;
    const pin = await pinService.createPin(userId, category, latitude, longitude, title);
    res.status(201).json({ pin });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function list(req, res) {
  try {
    const { userId } = req.params;
    const pins = await pinService.getPinsForUser(userId);
    res.json({ pins });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    await pinService.deletePin(id, userId);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = { create, list, remove };
