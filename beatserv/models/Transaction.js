const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  beat: { type: mongoose.Schema.Types.ObjectId, ref: "Beat", required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
