const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    name: { // Назва чату, може бути генерована або задана користувачем
        type: String,
        required: true,
    },
    participants: [{ // Масив ID користувачів (з MongoDB, не phpStudentId)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    isGroupChat: { // Чи це груповий чат
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    lastMessage: { // Для відображення останнього повідомлення в списку чатів
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);