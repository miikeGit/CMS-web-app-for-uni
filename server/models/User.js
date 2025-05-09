const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // ID з вашої PHP бази даних студентів, щоб зв'язати користувачів
    phpStudentId: {
        type: Number, // Або String, залежно від типу ID у вашій PHP базі
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    // Можна додати інші поля, наприклад, group_name
    // Статус користувача (online/offline) буде керуватися через Socket.IO
    // і може не зберігатися тут постійно, або зберігатися як lastSeen
    socketId: { // Для відстеження активного сокету користувача
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);