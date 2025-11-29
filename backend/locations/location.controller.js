const locationService = require("./location.service");
const { toLocationDTO, toLocationListDTO } = require("./location.dto");
const { processArrivalWatches } = require("../arrivalWatches/arrivalWatch.service");

async function upsert(req, res) {
  try {
    const { userId } = req.params;
    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ message: "latitude and longitude are required numbers" });
    }
    const loc = await locationService.upsertLocation(userId, latitude, longitude);
    const io = req.app.get("io");
    await processArrivalWatches(userId, latitude, longitude, io);
    res.json({ location: toLocationDTO(loc) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getForViewer(req, res) {
  try {
    const { viewerId } = req.params;
    const locations = await locationService.getLocationsForViewer(viewerId);
    res.json({ locations: toLocationListDTO(locations) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = { upsert, getForViewer };
