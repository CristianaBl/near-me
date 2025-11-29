const mongoose = require("mongoose");

const ArrivalWatchSchema = new mongoose.Schema(
  {
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pinId: { type: mongoose.Schema.Types.ObjectId, ref: "Pin", required: true },
    radiusMeters: { type: Number, default: 100 },
    eventType: { type: String, enum: ["arrival", "departure"], default: "arrival" },
    lastInside: { type: Boolean, default: null },
  },
  { timestamps: true }
);

ArrivalWatchSchema.index({ viewerId: 1, targetId: 1, pinId: 1, eventType: 1 }, { unique: true });

module.exports = mongoose.model("ArrivalWatch", ArrivalWatchSchema);
