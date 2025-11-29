const mongoose = require("mongoose");

const PinSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["home", "school", "church", "work", "restaurant", "other"],
      default: "other",
    },
    title: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pin", PinSchema);
