require("dotenv").config();
const express = require("express");
const Beat = require("../models/Beat");
const User = require("../models/User"); // Добавили импорт User
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require("multer");
const path = require("path");
const Transaction = require("../models/Transaction");
const Rating = require('../models/Rating'); 
const Comment = require("../models/Comment");
const SECRET_KEY = process.env.JWT_SECRET;
const fs = require('fs');
const util = require('util');
const unlinkAsync = util.promisify(fs.unlink);

if (!SECRET_KEY) {
    console.error("JWT_SECRET не определён в переменных окружения!");
}

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Токен не предоставлен" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Неверный формат токена" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY); // ✅ важно: SECRET_KEY должен быть определён
        req.user = decoded; // decoded = { userId: ... }
        next();
    } catch (error) {
        console.error("Ошибка верификации токена:", error.message);
        return res.status(401).json({ message: "Неверный или просроченный токен" });
    }
};

// Получить 10 последних битов по дате создания (новые сначала)
router.get('/recent', async (req, res) => {
  try {
    const recentBeats = await Beat.find()
      .sort({ createdAt: -1 }) // Сортировка по дате создания (новые сначала)
      .limit(10) // Ограничение 10 записей
      .populate('user', 'username'); // Добавляем информацию о пользователе

    // Добавляем информацию о рейтингах
    const beatsWithRatings = await Promise.all(recentBeats.map(async (beat) => {
      const ratings = await Rating.find({ beat: beat._id });
      const averageRating = ratings.length > 0 
        ? (ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length).toFixed(1)
        : null;
      
      return {
        ...beat.toObject(),
        averageRating: averageRating ? parseFloat(averageRating) : null,
        ratingsCount: ratings.length
      };
    }));

    res.json(beatsWithRatings);
  } catch (error) {
    console.error('Ошибка при получении последних битов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
// Конфигурация для загрузки изображений и аудиофайлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = file.mimetype.split("/")[0];
    const dir = fileType === "image" ? "assets/images" : "assets/audio";
    cb(null, dir); // Указываем папку для файлов
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Расширение файла
    cb(null, Date.now() + ext); // Генерация уникального имени
  },
});

const upload = multer({ storage });
router.get('/liked', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      search = '',
      score,
      page = 1, 
      limit = 20 
    } = req.query;

    // Находим все оценки пользователя
    const ratingQuery = { user: userId };
    if (score) ratingQuery.value = parseInt(score);

    const ratings = await Rating.find(ratingQuery).select('beat');
    const beatIds = ratings.map(r => r.beat);

    if (beatIds.length === 0) {
      return res.json({
        beats: [],
        totalPages: 0,
        currentPage: 1,
        totalBeats: 0
      });
    }

    // Формируем запрос для битов
    const beatQuery = { _id: { $in: beatIds } };
    
    if (search) {
      beatQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    const [beats, count] = await Promise.all([
      Beat.find(beatQuery)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      Beat.countDocuments(beatQuery)
    ]);

    res.json({
      beats,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalBeats: count
    });
  } catch (err) {
    console.error('Ошибка сервера в /liked:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


// Получить самые популярные биты за период (day/month/year) по рейтингу
router.get('/popular/:period', async (req, res) => {
    try {
        const period = req.params.period;
        let dateFilter = {};
        
        // Устанавливаем фильтр по дате в зависимости от периода
        const now = new Date();
        if (period === 'day') {
            dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 1)) } };
        } else if (period === 'month') {
            dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
        } else if (period === 'year') {
            dateFilter = { createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) } };
        }
        
        // Агрегация для получения популярных битов по среднему рейтингу
        const popularBeats = await Rating.aggregate([
            {
                $lookup: {
                    from: 'beats',
                    localField: 'beat',
                    foreignField: '_id',
                    as: 'beat'
                }
            },
            { $unwind: '$beat' },
            { $match: { 'beat.createdAt': dateFilter.createdAt } },
            {
                $group: {
                    _id: '$beat._id',
                    beat: { $first: '$beat' },
                    averageRating: { $avg: '$value' },
                    ratingsCount: { $sum: 1 }
                }
            },
            { $sort: { averageRating: -1, ratingsCount: -1 } },
            { $limit: 20 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'beat.user',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: '$beat._id',
                    title: '$beat.title',
                    author: '$beat.author',
                    price: '$beat.price',
                    description: '$beat.description',
                    tags: '$beat.tags',
                    imageUrl: '$beat.imageUrl',
                    audioUrl: '$beat.audioUrl',
                    createdAt: '$beat.createdAt',
                    averageRating: { $round: ['$averageRating', 1] },
                    ratingsCount: 1,
                    'user.username': 1
                }
            }
        ]);
        
        res.json(popularBeats);
    } catch (error) {
        console.error('Ошибка при получении популярных битов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/download/:filename', authMiddleware, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../assets/audio', filename);
    
    // Проверяем, есть ли у пользователя этот бит в покупках
    const hasPurchased = await Transaction.findOne({
      buyer: req.user.userId,
      'beat.audioUrl': { $regex: filename }
    }).populate('beat');

    if (!hasPurchased) {
      return res.status(403).json({ error: "You haven't purchased this beat" });
    }

    // Отправляем файл для скачивания
    if (fs.existsSync(filePath)) {
      res.download(filePath, filename);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/rate/:beatId", authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const beatId = req.params.beatId;
  const { value } = req.body;

  if (value < 1 || value > 5) {
    return res.status(400).json({ error: "Оценка должна быть от 1 до 5" });
  }

  try {
    const beat = await Beat.findById(beatId);
    if (!beat) return res.status(404).json({ error: "Бит не найден" });

    const existingRating = await Rating.findOne({ beat: beatId, user: userId });

    if (existingRating) {
      existingRating.value = value;
      await existingRating.save();
      return res.json({ message: "Оценка обновлена", rating: existingRating });
    }

    const newRating = new Rating({ beat: beatId, user: userId, value });
    await newRating.save();

    res.status(201).json({ message: "Оценка добавлена", rating: newRating });
  } catch (error) {
    console.error("Ошибка при оценке бита:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});
// Получить текущую и среднюю оценку
router.get('/rating/:id', authMiddleware, async (req, res) => {
  const beatId = req.params.id;
  const userId = req.user.userId;   

  try {
    const userRating = await Rating.findOne({ beat: beatId, user: userId });
    const allRatings = await Rating.find({ beat: beatId });

    const averageRating =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.value, 0) / allRatings.length
        : 0;

    res.json({
      userRating: userRating ? userRating.value : 0,
      averageRating: parseFloat(averageRating.toFixed(1)),
    });
  } catch (err) {
    console.error('Ошибка при получении оценки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});



router.post("/buy/:beatId", authMiddleware, async (req, res) => {
  try {
    const beatId = req.params.beatId;
    const buyerId = req.user.userId;

    // Проверяем, есть ли уже покупка этого бита пользователем
    const existingTransaction = await Transaction.findOne({
      beat: beatId,
      buyer: buyerId
    });

    if (existingTransaction) {
      return res.status(400).json({ error: "Вы уже купили этот бит" });
    }

    const beat = await Beat.findById(beatId).populate("user");
    if (!beat) return res.status(404).json({ error: "Бит не найден" });

    const seller = beat.user;
    if (seller._id.toString() === buyerId) {
      return res.status(400).json({ error: "Нельзя купить свой собственный бит" });
    }

    const buyer = await User.findById(buyerId);
    const admin = await User.findOne({ username: "admin0" });

    if (!buyer || !admin) {
      return res.status(404).json({ error: "Покупатель или админ не найден" });
    }

    if (buyer.balance < beat.price) {
      return res.status(400).json({ error: "Недостаточно средств" });
    }

    // Расчёт
    const commission = +(beat.price * 0.03).toFixed(2);
    const sellerAmount = beat.price - commission;

    // Перевод
    buyer.balance -= beat.price;
    seller.balance += sellerAmount;
    admin.balance += commission;

    // Сохранение всех пользователей
    await buyer.save();
    await seller.save();
    await admin.save();

    // Создание транзакции
    const transaction = new Transaction({
      beat: beat._id,
      buyer: buyer._id,
      seller: seller._id,
      amount: beat.price,
    });

    await transaction.save();

    res.status(200).json({ 
      message: "Покупка завершена", 
      transaction,
      newBalance: buyer.balance
    });
  } catch (error) {
    console.error("Ошибка при покупке бита:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});


router.post("/upload-image", authMiddleware, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Ошибка при загрузке изображения" });
  }
  res.json({ imageUrl: `assets/images/${req.file.filename}` });
});

router.post("/upload-audio", authMiddleware, upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Ошибка при загрузке аудио" });
  }
  res.json({ audioUrl: `assets/audio/${req.file.filename}` });
});
router.get("/my-beats", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { 
            search = '',
            page = 1, 
            limit = 20 
        } = req.query;

        const query = { user: userId };
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const [beats, count] = await Promise.all([
            Beat.find(query)
                .sort('-createdAt')
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('user', 'username'),
            Beat.countDocuments(query)
        ]);

        res.json({
            beats,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalBeats: count
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});
// Получить все биты с данными пользователя
router.get("/", async (req, res) => {
    try {
        const { 
            search = '',
            minPrice,
            maxPrice,
            tags,
            sort = '-createdAt', 
            page = 1, 
            limit = 20 
        } = req.query;

        // Создаем объект запроса
        const query = {};
        
        // Поиск по тексту
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } }
            ];
        }

        // Фильтр по цене
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Фильтр по тегам
        if (tags) {
            const tagsArray = Array.isArray(tags) ? tags : [tags];
            query.tags = { $in: tagsArray.map(tag => new RegExp(tag, 'i')) };
        }

        // Агрегация для получения битов с рейтингами
        const beats = await Beat.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: "ratings",
                    localField: "_id",
                    foreignField: "beat",
                    as: "ratings"
                }
            },
            {
                $addFields: {
                    averageRating: { $avg: "$ratings.value" },
                    ratingsCount: { $size: "$ratings" }
                }
            },
            { $sort: { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } },
            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    ratings: 0 // Исключаем массив ratings из результата
                }
            }
        ]);

        const count = await Beat.countDocuments(query);

        res.json({
            beats,
            totalPages: Math.ceil(count / Number(limit)),
            currentPage: Number(page),
            totalBeats: count
        });
    } catch (error) {
        console.error("Ошибка при получении битов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Получить бит по ID с данными пользователя
router.get("/:id", async (req, res) => {
    try {
        const beat = await Beat.findById(req.params.id).populate("user", "username");
        if (!beat) return res.status(404).json({ error: "Бит не найден" });
        res.json(beat);
    } catch (error) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Создать новый бит с привязкой к пользователю
router.post("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, author, price, description, tags, imageUrl, audioUrl } = req.body;

        const existingUser = await User.findById(userId);
        if (!existingUser) return res.status(404).json({ error: "Пользователь не найден" });

        const newBeat = new Beat({
            title,
            author,
            price,
            description,
            tags,
            imageUrl,
            audioUrl,
            user: userId,
        });

        await newBeat.save();
        res.status(201).json(newBeat);
    } catch (error) {
        res.status(500).json({ error: "Ошибка при создании бита" });
    }
});


// Обновить бит (если владелец или админ)
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const beat = await Beat.findById(req.params.id);
        if (!beat) return res.status(404).json({ error: "Бит не найден" });

        const existingUser = await User.findById(userId);
        if (!existingUser) return res.status(404).json({ error: "Пользователь не найден" });

        const isOwner = beat.user.toString() === userId;
        const isAdmin = existingUser.username === 'admin0';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "Нет прав на редактирование" });
        }

        const updatedBeat = await Beat.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedBeat);
    } catch (error) {
        res.status(500).json({ error: "Ошибка при обновлении бита" });
    }
});

// Удалить бит (если владелец или админ)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const beatId = req.params.id;

    // Находим бит
    const beat = await Beat.findById(beatId);
    if (!beat) {
      return res.status(404).json({ 
        success: false,
        error: "Beat not found",
        message: "The requested beat does not exist"
      });
    }

    // Проверяем пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found",
        message: "User account not found"
      });
    }

    // Проверяем права
    const isOwner = beat.user.toString() === userId;
    const isAdmin = user.username === 'admin0';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Forbidden",
        message: "You don't have permission to delete this beat"
      });
    }

    // Проверяем наличие покупок
    const purchasesCount = await Transaction.countDocuments({ beat: beatId });
    if (purchasesCount > 0) {
      return res.status(400).json({ 
        success: false,
        error: "Beat has purchases",
        message: `Cannot delete beat - it has been purchased ${purchasesCount} time(s)`
      });
    }

    // Удаляем связанные данные
    await Rating.deleteMany({ beat: beatId });
    await Comment.deleteMany({ beat: beatId });

    // Удаляем файлы
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (beat.audioUrl) {
        const audioPath = path.join(__dirname, '../assets/audio', path.basename(beat.audioUrl));
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      }
      
      if (beat.imageUrl) {
        const imagePath = path.join(__dirname, '../assets/images', path.basename(beat.imageUrl));
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    } catch (fileError) {
      console.error('File deletion error:', fileError);
      return res.status(500).json({
        success: false,
        error: "File deletion failed",
        message: "Beat data deleted but files could not be removed"
      });
    }

    // Удаляем сам бит
    await Beat.findByIdAndDelete(beatId);

    res.json({ 
      success: true,
      message: "Beat and all related data deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting beat:', error);
    res.status(500).json({
      success: false,
      error: "Server error",
      message: "An unexpected error occurred while deleting the beat"
    });
  }
});



router.post("/delete-image", authMiddleware, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const userId = req.user.userId;

    if (!imageUrl) {
      return res.status(400).json({ 
        success: false,
        error: "Missing imageUrl", 
        message: "imageUrl обязателен"
      });
    }

    const fileName = path.basename(imageUrl);
    const filePath = path.join(__dirname, "../assets/images", fileName);

    const beat = await Beat.findOne({ imageUrl });
    if (!beat) {
      return res.status(404).json({ 
        success: false,
        error: "Beat not found", 
        message: "Бит с этим изображением не найден" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found", 
        message: "Пользователь не найден" 
      });
    }

    const isOwner = beat.user.toString() === userId;
    const isAdmin = user.username === "admin0";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Forbidden", 
        message: "У вас нет прав на удаление этого изображения" 
      });
    }

    if (fs.existsSync(filePath)) {
      await unlinkAsync(filePath);
      return res.json({ 
        success: true, 
        message: "Файл успешно удалён" 
      });
    } else {
      return res.status(404).json({ 
        success: false,
        error: "File not found", 
        message: "Файл не найден по указанному пути" 
      });
    }

  } catch (error) {
    console.error("Ошибка при удалении изображения:", error);
    return res.status(500).json({ 
      success: false,
      error: "Server error", 
      message: "Произошла ошибка на сервере при удалении изображения" 
    });
  }
});

module.exports = router;
