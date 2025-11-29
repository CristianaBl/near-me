const mongoose = require("mongoose");

const FollowRequestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

// Ensure only one active request per pair
FollowRequestSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("FollowRequest", FollowRequestSchema);
