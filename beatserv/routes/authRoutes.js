const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require('../auth');
const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

// Регистрация пользователя
router.post("/register", async (req, res) => {
    try {
        const { username, password, userPhoto, balance, description } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: "Пользователь уже существует" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Создаем нового пользователя с дополнительными полями
        const newUser = new User({
            username,
            password: hashedPassword,
            userPhoto: userPhoto || "", // Если не передано, оставляем пустое фото
            balance: balance || 0, // Если не передано, баланс 0
            description: description || "", // Если не передано, описание пустое
        });

        await newUser.save();
        res.status(201).json({ message: "Регистрация успешна" });
    } catch (err) {
        res.status(500).json({ message: "Ошибка на сервере" });
    }
});


// Вход в систему
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.status(400).json({ message: "Неверный логин или пароль" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Неверный логин или пароль" });

        // Создаем токен, используя _id пользователя
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: "1h" });

        // Возвращаем _id, username и новые поля пользователя
        res.json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                userPhoto: user.userPhoto,
                balance: user.balance,
                description: user.description,
            }
        });
        console.log(user._id)
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка на сервере" });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


module.exports = router;
