const express = require("express");
const Comment = require("../models/Comment");
const Beat = require("../models/Beat");
const User = require("../models/User");
const router = express.Router();
const authMiddleware = require("../auth");

// Получить комментарии для бита с пагинацией
router.get("/beat/:beatId", async (req, res) => {
  try {
    const { beatId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find({ beat: beatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({ beat: beatId });

    res.json({
      comments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalComments: total
    });
  } catch (error) {
    console.error("Ошибка при получении комментариев:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Добавить комментарий
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { text, beatId } = req.body;
    const userId = req.user.userId;

    const beat = await Beat.findById(beatId);
    if (!beat) return res.status(404).json({ error: "Бит не найден" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const comment = new Comment({
      text,
      beat: beatId,
      user: userId,
      username: user.username
    });

    await comment.save();
    res.status(201).json(comment);
  } catch (error) {
    console.error("Ошибка при добавлении комментария:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Редактировать комментарий
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ error: "Комментарий не найден" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const beat = await Beat.findById(comment.beat);
    if (!beat) return res.status(404).json({ error: "Бит не найден" });

    // Проверка прав: автор комментария, владелец бита или админ
    const isCommentOwner = comment.user.toString() === userId;
    const isBeatOwner = beat.user.toString() === userId || beat.author === user.username;
    const isAdmin = user.username === "admin0";

    if (!isCommentOwner && !isBeatOwner && !isAdmin) {
      return res.status(403).json({ error: "Нет прав на редактирование" });
    }

    comment.text = text;
    await comment.save();

    res.json(comment);
  } catch (error) {
    console.error("Ошибка при редактировании комментария:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Удалить комментарий
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ error: "Комментарий не найден" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const beat = await Beat.findById(comment.beat);
    if (!beat) return res.status(404).json({ error: "Бит не найден" });

    // Проверка прав: автор комментария, владелец бита или админ
    const isCommentOwner = comment.user.toString() === userId;
    const isBeatOwner = beat.user.toString() === userId || beat.author === user.username;
    const isAdmin = user.username === "admin0";

    if (!isCommentOwner && !isBeatOwner && !isAdmin) {
      return res.status(403).json({ error: "Нет прав на удаление" });
    }

    await Comment.findByIdAndDelete(id);
    res.json({ message: "Комментарий удалён" });
  } catch (error) {
    console.error("Ошибка при удалении комментария:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;