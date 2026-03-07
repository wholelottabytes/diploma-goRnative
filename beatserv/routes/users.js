const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Beat = require("../models/Beat");
const authenticateToken = require("../auth.js");

// Получение публичного профиля пользователя по username
// routes/users.js
router.get("/by-username/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    // Находим пользователя
    const user = await User.findOne({ username })
      .select("_id username userPhoto description balance")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Получаем биты с populate пользователя
    const beats = await Beat.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'username') // Добавляем populate
      .lean();

    const totalBeats = await Beat.countDocuments({ user: user._id });

    res.json({
      user,
      beats,
      totalPages: Math.ceil(totalBeats / limit),
      currentPage: page,
      totalBeats
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;