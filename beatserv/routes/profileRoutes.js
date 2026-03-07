const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const authenticateToken = require("../auth");
const Transaction = require("../models/Transaction");
const Beat = require("../models/Beat"); // Добавьте этот импорт
const fs = require('fs');

// Настройка multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "assets/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// GET Beats by user ID с пагинацией
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Используем userId

    // Получаем данные пользователя
    const user = await User.findById(userId).select("username avatar description");

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Получаем все биты пользователя
    const beats = await Beat.find({ user: userId })
      .select("title description price tags imageUrl audioUrl createdAt")
      .populate("user", "username");

    res.json({
      user: {
        username: user.username,
        avatar: user.avatar,
        description: user.description
      },
      beats
    });
  } catch (err) {
    console.error('Ошибка при получении данных профиля:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение профиля
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password"); // Используем userId
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения профиля" });
  }
});

// Обновление фото профиля
router.put("/photo", authenticateToken, upload.single("photo"), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    // Удаляем старое фото, если оно есть
    if (user.userPhoto) {
      const oldPhotoPath = path.join(__dirname, "..", user.userPhoto);
      fs.unlink(oldPhotoPath, (err) => {
        if (err) {
          console.error("Ошибка при удалении старого фото:", err);
        }
      });
    }

    // Обновляем ссылку на новое фото
    const newPhotoPath = `assets/${req.file.filename}`;
    user.userPhoto = newPhotoPath;
    await user.save();

    res.json(user);
  } catch (err) {
    console.error('Ошибка обновления фото профиля:', err);
    res.status(500).json({ error: "Ошибка обновления фото профиля" });
  }
});
// Обновление/добавление описания
router.put("/description", authenticateToken, async (req, res) => {
  try {
    const { description } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId, // Используем userId
      { description },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления описания" });
  }
});

// Пополнение баланса
router.put("/balance", authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Некорректная сумма" });
    }

    const user = await User.findById(req.user.userId); // Используем userId
    user.balance = (user.balance || 0) + parseFloat(amount);
    await user.save();

    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: "Ошибка пополнения баланса" });
  }
});

router.get("/transactions", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Используем userId
    const { type, page = 1, limit = 5 } = req.query;
    const skip = (page - 1) * limit;

    const query = type === 'purchases' 
      ? { buyer: userId } 
      : { seller: userId };

    const transactions = await Transaction.find(query)
      .populate([
        {
          path: "beat",
          select: "title imageUrl audioUrl price description tags user createdAt",
          populate: { path: "user", select: "username" }
        },
        ...(type === 'sales' ? [{ path: "buyer", select: "username" }] : [])
      ])
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map(t => {
      const safeDate = (date) => {
        try {
          if (!date) return new Date().toISOString();
          if (typeof date === 'string' && date.includes('ObjectId')) {
            return new Date().toISOString();
          }
          const parsed = new Date(date);
          return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
        } catch {
          return new Date().toISOString();
        }
      };

      return {
        id: t._id.toString(),
        beatId: t.beat?._id.toString(),
        beatTitle: t.beat?.title || 'Untitled',
        beatImage: t.beat?.imageUrl || '',
        beatAudioUrl: t.beat?.audioUrl || '',
        beatPrice: t.beat?.price || 0,
        beatDescription: t.beat?.description || '',
        beatTags: t.beat?.tags || [],
        beatAuthor: t.beat?.user?.username || 'Unknown',
        amount: t.amount,
        date: safeDate(t.date),
        ...(type === 'sales' && { 
          buyerUsername: t.buyer?.username || 'Unknown' 
        })
      };
    });

    res.json({
      transactions: formattedTransactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error("Transaction error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;