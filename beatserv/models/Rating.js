const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  beat: { type: mongoose.Schema.Types.ObjectId, ref: "Beat", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  value: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });

ratingSchema.index({ beat: 1, user: 1 }, { unique: true }); // Один пользователь может оценить бит только один раз

module.exports = mongoose.model("Rating", ratingSchema);
