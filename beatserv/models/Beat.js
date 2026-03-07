const mongoose = require("mongoose");

const BeatSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    tags: { type: [String], required: true },
    imageUrl: { type: String, required: true },
    audioUrl: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } // Связь с юзером
}, { timestamps: true });

module.exports = mongoose.model("Beat", BeatSchema);
