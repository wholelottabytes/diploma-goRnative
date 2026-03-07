require("dotenv").config();
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;

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
        const decoded = jwt.verify(token, SECRET_KEY);
        // Сохраняем userId в req.user.userId для единообразия
        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        console.error("Ошибка верификации токена:", error.message);
        return res.status(401).json({ message: "Неверный или просроченный токен" });
    }
};

module.exports = authMiddleware;