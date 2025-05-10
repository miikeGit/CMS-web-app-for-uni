const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// Зберігання активних користувачів (phpStudentId -> socket.id)
const activeUsers = new Map(); // { phpStudentId: socketId }
const socketIdToPhpStudentId = new Map(); // { socketId: phpStudentId }

async function getOrCreateMongoUser(phpStudentId, firstName, lastName) {
    let user = await User.findOne({ phpStudentId });
    if (!user) {
        user = new User({ phpStudentId, firstName, lastName, status: 'offline' }); // Початковий статус
        await user.save();
    }
    return user;
}

function initializeSocketService(io) {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Автентифікація користувача (отримання phpStudentId з фронтенду)
        socket.on('authenticate', async ({ phpStudentId, firstName, lastName }) => {
            if (!phpStudentId) {
                console.log('Authentication failed: phpStudentId missing');
                socket.disconnect(); // Або відправити помилку
                return;
            }
            console.log(`Authenticating user ${phpStudentId} (${firstName} ${lastName}) with socket ${socket.id}`);

            try {
                const mongoUser = await getOrCreateMongoUser(phpStudentId, firstName, lastName);
                mongoUser.socketId = socket.id;
                mongoUser.status = 'online';
                await mongoUser.save();

                activeUsers.set(mongoUser.phpStudentId.toString(), socket.id);
                socketIdToPhpStudentId.set(socket.id, mongoUser.phpStudentId.toString());

                socket.emit('authenticated', { mongoUserId: mongoUser._id, message: 'Successfully authenticated with chat server.' });

                // Повідомити інших користувачів про онлайн статус
                socket.broadcast.emit('userStatusChanged', { phpStudentId: mongoUser.phpStudentId, status: 'online', userId: mongoUser._id });

                // Приєднати користувача до всіх його існуючих чат-кімнат
                const userChatRooms = await ChatRoom.find({ participants: mongoUser._id });
                userChatRooms.forEach(room => {
                    socket.join(room._id.toString());
                    console.log(`User ${mongoUser.phpStudentId} (socket ${socket.id}) joined room ${room._id}`);
                });

            } catch (error) {
                console.error('Error during socket authentication:', error);
                socket.emit('authError', { message: 'Authentication failed on server.' });
            }
        });

        socket.on('createChatRoom', async ({participantPhpStudentIds, createdByPhpStudentId }) => {
            try {
                const creatorMongoUser = await User.findOne({ phpStudentId: createdByPhpStudentId });
                if (!creatorMongoUser) {
                    socket.emit('chatError', { message: 'Creator not found.' });
                    return;
                }

                const participantMongoUsers = await User.find({ phpStudentId: { $in: participantPhpStudentIds } });
                const participantMongoUserIds = participantMongoUsers.map(u => u._id);

                // Переконатися, що творець є серед учасників
                if (!participantMongoUserIds.some(id => id.equals(creatorMongoUser._id))) {
                    participantMongoUserIds.push(creatorMongoUser._id);
                }

                // Перевірка, чи існує вже приватний чат між цими двома користувачами
                if (participantMongoUserIds.length === 2) { // Якщо це потенційно приватний чат і назва не задана
                    const existingPrivateChat = await ChatRoom.findOne({
                        isGroupChat: false,
                        participants: { $all: participantMongoUserIds, $size: 2 }
                    });
                    if (existingPrivateChat) {
                        socket.emit('chatRoomExists', existingPrivateChat); // Повідомити клієнта, що чат вже існує
                        // Приєднати поточного користувача до цієї кімнати, якщо він ще не там
                        if (creatorMongoUser.socketId && !io.sockets.sockets.get(creatorMongoUser.socketId).rooms.has(existingPrivateChat._id.toString())) {
                             io.sockets.sockets.get(creatorMongoUser.socketId).join(existingPrivateChat._id.toString());
                        }
                        return;
                    }
                }
                const newChatRoom = new ChatRoom({
                    name: `Group: ${participantMongoUsers.map(p => p.firstName).join(', ')}`,
                    participants: participantMongoUserIds,
                    isGroupChat: participantMongoUserIds.length > 2,
                    createdBy: creatorMongoUser._id,
                });
                await newChatRoom.save();
                const populatedNewChatRoom = await ChatRoom.findById(newChatRoom._id)
                                                    .populate('participants', 'phpStudentId firstName lastName status socketId')
                                                    .populate('createdBy', 'phpStudentId firstName lastName socketId');


                // Приєднати всіх учасників до нової кімнати та повідомити їх
                participantMongoUserIds.forEach(async (userId) => {
                    const participant = await User.findById(userId);
                    if (participant && participant.socketId) {
                        const targetSocket = io.sockets.sockets.get(participant.socketId);
                        if (targetSocket) {
                            targetSocket.join(populatedNewChatRoom._id.toString());
                            targetSocket.emit('newChatRoomCreated', populatedNewChatRoom);
                            console.log(`User ${participant.phpStudentId} (socket ${participant.socketId}) joined and notified for new room ${populatedNewChatRoom._id}`);
                        }
                    }
                });
                console.log(`Chat room created: ${populatedNewChatRoom._id} by ${createdByPhpStudentId}`);

            } catch (error) {
                console.error('Error creating chat room:', error);
                socket.emit('chatError', { message: 'Failed to create chat room.' });
            }
        });

        // Додавання користувачів до існуючого чату
        socket.on('addUsersToChat', async ({ chatRoomId, usersToAddPhpStudentIds }) => {
            try {
                const chatRoom = await ChatRoom.findById(chatRoomId);
                if (!chatRoom) {
                    socket.emit('chatError', { message: 'Chat room not found.' });
                    return;
                }

                const usersToAddMongo = await User.find({ phpStudentId: { $in: usersToAddPhpStudentIds } });
                const usersToAddMongoIds = usersToAddMongo.map(u => u._id);

                let newUsersAdded = false;
                usersToAddMongoIds.forEach(userId => {
                    if (!chatRoom.participants.some(pId => pId.equals(userId))) {
                        chatRoom.participants.push(userId);
                        newUsersAdded = true;
                    }
                });

                if (newUsersAdded) {
                    chatRoom.isGroupChat = true;
                    const firstFewParticipantDocs = await User.find({ _id: { $in: chatRoom.participants.slice(0, 3) } }).select('firstName');
                    let newGroupName = `Group: ${firstFewParticipantDocs.map(p => p.firstName).join(', ')}`;
                    if (firstFewParticipantDocs.length < chatRoom.participants.length && firstFewParticipantDocs.length === 3) {
                        newGroupName += '..';
                    }
                    chatRoom.name = newGroupName;
                    await chatRoom.save();
                }

                const updatedRoom = await ChatRoom.findById(chatRoomId)
                                            .populate('participants', 'phpStudentId firstName lastName status socketId')
                                            .populate('createdBy', 'phpStudentId firstName lastName  socketId')
                                            .populate({
                                                path: 'lastMessage',
                                                populate: { path: 'senderId', select: 'phpStudentId firstName lastName status socketId' }
                                            });

                // Повідомити нових та існуючих учасників
                updatedRoom.participants.forEach(participant => {
                    if (participant.socketId) {
                        const targetSocket = io.sockets.sockets.get(participant.socketId);
                        if (targetSocket) {
                            // Якщо це новий учасник, приєднати його до кімнати
                            if (usersToAddMongoIds.some(id => id.equals(participant._id)) && !targetSocket.rooms.has(chatRoomId.toString())) {
                               targetSocket.join(chatRoomId.toString());
                               console.log(`User ${participant.phpStudentId} (socket ${participant.socketId}) newly joined room ${chatRoomId}`);
                            }
                            targetSocket.emit('usersAddedToChat', { chatRoomId, updatedRoom });
                            console.log(`Notified user ${participant.phpStudentId} about an update in room ${chatRoomId}`);
                        }
                    }
                });
                 console.log(`Users processed for chat ${chatRoomId}. New users added: ${newUsersAdded}`);
            } catch (error) {
                console.error('Error adding users to chat:', error);
                socket.emit('chatError', { message: 'Failed to add users to chat.' });
            }
        });


        // Надсилання повідомлення
        socket.on('sendMessage', async ({ chatRoomId, senderPhpStudentId, content }) => {
            try {
                const senderMongoUser = await User.findOne({ phpStudentId: senderPhpStudentId });
                if (!senderMongoUser) {
                    socket.emit('chatError', { message: 'Sender not found.' });
                    return;
                }

                const chatRoom = await ChatRoom.findById(chatRoomId);
                if (!chatRoom || !chatRoom.participants.some(pId => pId.equals(senderMongoUser._id))) {
                    socket.emit('chatError', { message: 'Chat room not found or you are not a participant.' });
                    return;
                }

                const newMessage = new Message({
                    chatRoomId,
                    senderId: senderMongoUser._id,
                    content,
                    readBy: [senderMongoUser._id] // Відправник автоматично прочитав
                });
                await newMessage.save();

                chatRoom.lastMessage = newMessage._id;
                await chatRoom.save();

                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('senderId', 'phpStudentId firstName lastName status socketId');

                // Надіслати повідомлення всім учасникам кімнати
                io.to(chatRoomId.toString()).emit('newMessage', populatedMessage);
                console.log(`Message sent in room ${chatRoomId} by ${senderPhpStudentId} to its members.`);

                // Логіка для сповіщень (дзвіночок)
                chatRoom.participants.forEach(async (participantMongoId) => {
                    if (!participantMongoId.equals(senderMongoUser._id)) { // Не надсилати сповіщення самому собі
                        const participantUser = await User.findById(participantMongoId);
                        // Надсилаємо сповіщення, навіть якщо користувач офлайн (він побачить при логіні, якщо реалізовано)
                        // Або якщо він онлайн, але не в активному чаті
                        if (participantUser && participantUser.socketId) {
                            const targetSocket = io.sockets.sockets.get(participantUser.socketId);
                            if (targetSocket) {
                                // Клієнт сам вирішить, чи показувати анімацію дзвіночка
                                targetSocket.emit('notification', {
                                    message: populatedMessage,
                                    chatRoomId: chatRoomId,
                                    chatRoomName: chatRoom.name // Надсилаємо назву чату для сповіщення
                                });
                                console.log(`Notification sent to ${participantUser.phpStudentId} for message in room ${chatRoomId}`);
                            }
                        } else if (participantUser) {
                            // Логіка для збереження "непрочитаних" для офлайн користувачів (якщо потрібно)
                            // Наприклад, додати поле unreadMessages у моделі User або ChatRoomParticipant
                            console.log(`User ${participantUser.phpStudentId} is offline. Notification for room ${chatRoomId} could be stored.`);
                        }
                    }
                });


            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('chatError', { message: 'Failed to send message.' });
            }
        });

        // Завантаження історії повідомлень для чату
        socket.on('loadChatHistory', async ({ chatRoomId }) => {
            try {
                const messages = await Message.find({ chatRoomId })
                    .sort({ createdAt: 1 })
                    .populate('senderId', 'phpStudentId firstName lastName status socketId');
                socket.emit('chatHistory', { chatRoomId, messages });
                console.log(`History for chat ${chatRoomId} sent to socket ${socket.id}`);
            } catch (error) {
                console.error('Error loading chat history:', error);
                socket.emit('chatError', { message: 'Failed to load chat history.' });
            }
        });

        // Завантаження списку чат-кімнат для користувача
        socket.on('loadChatRooms', async ({ userPhpStudentId }) => {
            try {
                const user = await User.findOne({ phpStudentId: userPhpStudentId });
                if (!user) {
                    socket.emit('chatError', { message: 'User not found.' });
                    return;
                }

                const chatRooms = await ChatRoom.find({ participants: user._id })
                    .populate('participants', 'phpStudentId firstName lastName status socketId') // Статуси учасників
                    .populate({
                        path: 'lastMessage',
                        populate: { path: 'senderId', select: 'phpStudentId firstName lastName status socketId' }
                    })
                    .sort({ updatedAt: -1 });

                socket.emit('chatRoomsList', chatRooms);
                console.log(`Chat rooms list for user ${userPhpStudentId} sent to socket ${socket.id}`);
            } catch (error) {
                console.error('Error loading chat rooms:', error);
                socket.emit('chatError', { message: 'Failed to load chat rooms.' });
            }
        });


        // Користувач відключився
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.id}`);
            const phpStudentId = socketIdToPhpStudentId.get(socket.id);
            if (phpStudentId) {
                try {
                    const user = await User.findOne({ phpStudentId });
                    if (user) {
                        user.socketId = null;
                        user.status = 'offline';
                        // user.lastSeen = new Date(); // Можна додати
                        await user.save();
                        // Повідомити інших користувачів про офлайн статус
                        socket.broadcast.emit('userStatusChanged', { phpStudentId, status: 'offline', userId: user._id });
                        console.log(`User ${phpStudentId} status updated to offline.`);
                    }
                } catch (error) {
                    console.error('Error updating user status on disconnect:', error);
                }
                activeUsers.delete(phpStudentId);
                socketIdToPhpStudentId.delete(socket.id);
            }
        });
    });
}

module.exports = { initializeSocketService };