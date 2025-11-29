const ArrivalWatch = require("./arrivalWatch.model");
const Pin = require("../pins/pin.model");

let ensuredIndexFix = false;
async function ensureLegacyIndexDropped() {
  if (ensuredIndexFix) return;
  ensuredIndexFix = true;
  try {
    const indexes = await ArrivalWatch.collection.indexes();
    const legacy = indexes.find(
      (idx) =>
        idx.key.viewerId === 1 &&
        idx.key.targetId === 1 &&
        idx.key.pinId === 1 &&
        !idx.key.eventType
    );
    if (legacy) {
      await ArrivalWatch.collection.dropIndex(legacy.name);
    }
  } catch (err) {
    // swallow; index may not exist yet
  }
}

async function createWatch(viewerId, targetId, pinId, radiusMeters = 100, eventType = "arrival") {
  await ensureLegacyIndexDropped();
  const exists = await ArrivalWatch.findOne({ viewerId, targetId, pinId, eventType });
  if (exists) throw new Error("Watch already exists for this pin and event type");
  return ArrivalWatch.create({ viewerId, targetId, pinId, radiusMeters, eventType });
}

async function listWatchesByViewer(viewerId) {
  return ArrivalWatch.find({ viewerId }).sort({ createdAt: -1 }).populate("pinId");
}

async function removeWatch(id, viewerId) {
  return ArrivalWatch.findOneAndDelete({ _id: id, viewerId });
}

async function findWatchesForTarget(targetId) {
  return ArrivalWatch.find({ targetId }).populate("pinId");
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function processArrivalWatches(targetId, latitude, longitude, io) {
  if (!io) return;
  const watches = await findWatchesForTarget(targetId);
  for (const w of watches) {
    const pin = w.pinId;
    if (!pin) continue;
    const dist = haversineDistanceMeters(
      latitude,
      longitude,
      pin.latitude,
      pin.longitude
    );
    const inside = dist <= (w.radiusMeters || 100);
    const shouldTrigger =
      (w.eventType === "arrival" && !w.lastInside && inside) ||
      (w.eventType === "departure" && w.lastInside && !inside);

    if (shouldTrigger) {
      io.to(String(w.viewerId)).emit("arrival-triggered", {
        watchId: w._id,
        targetId,
        pinId: pin._id,
        pinLat: pin.latitude,
        pinLng: pin.longitude,
        distance: dist,
        eventType: w.eventType,
      });
    }

    const newInside = inside;
    if (w.lastInside !== newInside) {
      w.lastInside = newInside;
      await w.save();
    }
  }
}

module.exports = {
  createWatch,
  listWatchesByViewer,
  removeWatch,
  findWatchesForTarget,
  processArrivalWatches,
};
