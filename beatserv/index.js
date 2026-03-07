require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require('path');

const authRoutes = require("./routes/authRoutes");
const beatRoutes = require("./routes/beatRoutes");
const profileRoutes = require('./routes/profileRoutes');
const usersRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 5000;

// Подключение к MongoDB
mongoose
    .connect("mongodb://127.0.0.1:27017/beats_platform")
    .then(() => console.log("MongoDB подключена"))
    .catch((err) => console.error("Ошибка подключения к MongoDB", err));

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("success");
});
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use("/auth", authRoutes);
app.use("/beats", beatRoutes);
app.use('/profile', profileRoutes);
app.use('/users', usersRoutes);
app.use('/comments', commentRoutes);

app.listen(PORT, '0.0.0.0', () => console.log(`Сервер запущен на порту ${PORT}`));

