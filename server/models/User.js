const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phpStudentId: {
        type: Number,
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
    socketId: {
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