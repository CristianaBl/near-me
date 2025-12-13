const ArrivalWatch = require("./arrivalWatch.model");
const Pin = require("../pins/pin.model");
const Location = require("../locations/location.model");

let ensuredIndexFix = false;
async function ensureLegacyIndexDropped() {
  if (ensuredIndexFix) return;
  ensuredIndexFix = true;
  try {
    const indexes = await ArrivalWatch.collection.indexes();
    const legacy = indexes.filter(
      (idx) =>
        idx.key.viewerId === 1 &&
        idx.key.targetId === 1 &&
        idx.key.pinId === 1 &&
        idx.key.eventType === 1 &&
        !idx.partialFilterExpression
    );
    for (const l of legacy) {
      await ArrivalWatch.collection.dropIndex(l.name);
    }
    const legacyNoEvent = indexes.find(
      (idx) =>
        idx.key.viewerId === 1 &&
        idx.key.targetId === 1 &&
        idx.key.pinId === 1 &&
        !idx.key.eventType
    );
    if (legacyNoEvent) {
      await ArrivalWatch.collection.dropIndex(legacyNoEvent.name);
    }
  } catch (err) {
    // swallow; index may not exist yet
  }
}

async function createWatch(
  viewerId,
  targetId,
  pinId,
  radiusMeters = 200,
  eventType = "arrival",
  useViewerLocation = false
) {
  await ensureLegacyIndexDropped();

  const useViewer = !!useViewerLocation;

  if (!viewerId || !targetId) throw new Error("viewerId and targetId are required");
  if (!useViewer && !pinId) throw new Error("pinId is required unless using viewer radius");

  const sanitizedEventType = eventType === "departure" ? "departure" : "arrival";
  const radius = Number(radiusMeters);
  const radiusToUse = Number.isFinite(radius) && radius > 0 ? radius : 200;

  const exists = await ArrivalWatch.findOne(
    useViewer
      ? { viewerId, targetId, eventType: sanitizedEventType, useViewerLocation: true }
      : { viewerId, targetId, pinId, eventType: sanitizedEventType, useViewerLocation: { $ne: true } }
  );
  if (exists) throw new Error("Watch already exists for this target and event type");

  const payload = {
    viewerId,
    targetId,
    radiusMeters: radiusToUse,
    eventType: sanitizedEventType,
    useViewerLocation: useViewer,
  };
  if (!useViewer) {
    payload.pinId = pinId;
  }

  return ArrivalWatch.create(payload);
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
  const viewerLocIds = Array.from(
    new Set(
      watches
        .filter((w) => w.useViewerLocation)
        .map((w) => String(w.viewerId))
    )
  );
  const viewerLocations = viewerLocIds.length
    ? await Location.find({ userId: { $in: viewerLocIds } })
    : [];
  const viewerLocMap = new Map(viewerLocations.map((l) => [String(l.userId), l]));

  for (const w of watches) {
    let anchorLat;
    let anchorLng;
    if (w.useViewerLocation) {
      const viewerLoc = viewerLocMap.get(String(w.viewerId));
      if (!viewerLoc) continue;
      anchorLat = viewerLoc.latitude;
      anchorLng = viewerLoc.longitude;
    } else {
      const pin = w.pinId;
      if (!pin) continue;
      anchorLat = pin.latitude;
      anchorLng = pin.longitude;
    }

    const dist = haversineDistanceMeters(latitude, longitude, anchorLat, anchorLng);
    const radius = w.radiusMeters || 200;
    const inside = dist <= radius;
    const shouldTrigger =
      (w.eventType === "arrival" && !w.lastInside && inside) ||
      (w.eventType === "departure" && w.lastInside && !inside);

    if (shouldTrigger) {
      const payload = {
        watchId: w._id,
        targetId,
        distance: dist,
        radiusMeters: radius,
        eventType: w.eventType,
        useViewerLocation: !!w.useViewerLocation,
      };
      if (!w.useViewerLocation && w.pinId) {
        payload.pinId = w.pinId._id || w.pinId;
        payload.pinLat = anchorLat;
        payload.pinLng = anchorLng;
      }
      io.to(String(w.viewerId)).emit("arrival-triggered", payload);
    }

    const newInside = inside;
    if (w.lastInside !== newInside) {
      w.lastInside = newInside;
      await w.save();
    }
  }
}

async function processViewerLocationWatches(viewerId, latitude, longitude, io) {
  if (!io) return;
  const watches = await ArrivalWatch.find({ viewerId, useViewerLocation: true });
  if (!watches.length) return;

  const targetIds = Array.from(new Set(watches.map((w) => String(w.targetId))));
  const targetLocations = await Location.find({ userId: { $in: targetIds } });
  const targetLocMap = new Map(targetLocations.map((l) => [String(l.userId), l]));

  for (const w of watches) {
    const targetLoc = targetLocMap.get(String(w.targetId));
    if (!targetLoc) continue;

    const dist = haversineDistanceMeters(
      latitude,
      longitude,
      targetLoc.latitude,
      targetLoc.longitude
    );
    const radius = w.radiusMeters || 200;
    const inside = dist <= radius;
    const shouldTrigger =
      (w.eventType === "arrival" && !w.lastInside && inside) ||
      (w.eventType === "departure" && w.lastInside && !inside);

    if (shouldTrigger) {
      io.to(String(w.viewerId)).emit("arrival-triggered", {
        watchId: w._id,
        targetId: w.targetId,
        distance: dist,
        radiusMeters: radius,
        eventType: w.eventType,
        useViewerLocation: true,
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
  processViewerLocationWatches,
};
