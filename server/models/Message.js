const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatRoomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true,
    },
    senderId: { // ID користувача (з MongoDB)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    readBy: [{ // Масив ID користувачів, які прочитали повідомлення
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
    // Можна додати тип повідомлення (текст, зображення тощо)
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);