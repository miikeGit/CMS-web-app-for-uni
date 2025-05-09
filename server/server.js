const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const connectDB = require('./config/db');
const { initializeSocketService } = require('./services/socketService');
// const chatRoutes = require('./routes/chatRoutes'); // Якщо потрібні REST API маршрути


// npm run dev
// mongod.exe

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost", // Дозволити запити з вашого фронтенду
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Підключення до MongoDB
connectDB();

// Middleware
app.use(express.json()); // Для парсингу JSON тіл запитів

// Socket.IO сервіс
initializeSocketService(io);

// Маршрути API (якщо є)
// app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 3000; // Порт для Node.js сервера

server.listen(PORT, () => {
    console.log(`Node.js server running on port ${PORT}`);
});