const arrivalWatchService = require("./arrivalWatch.service");

async function create(req, res) {
  try {
    const { viewerId, targetId, pinId, radiusMeters, eventType } = req.body;
    const watch = await arrivalWatchService.createWatch(viewerId, targetId, pinId, radiusMeters, eventType);
    res.status(201).json({ watch });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function list(req, res) {
  try {
    const { viewerId } = req.params;
    const watches = await arrivalWatchService.listWatchesByViewer(viewerId);
    res.json({ watches });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const { viewerId } = req.query;
    await arrivalWatchService.removeWatch(id, viewerId);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = { create, list, remove };
