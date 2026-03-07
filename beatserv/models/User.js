const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userPhoto: { type: String, default: '' }, // фото пользователя (по умолчанию пустая строка)
    balance: { type: Number, default: 0 },    // баланс (по умолчанию 0)
    description: { type: String, default: '' }, // описание (по умолчанию пустая строка)
});

module.exports = mongoose.model('User', userSchema);
