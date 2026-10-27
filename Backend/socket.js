const { Server } = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');

let io = null;

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);

        socket.on('join', async (data) => {
            try {
                const { userId, userType } = data; // userType: 'user' | 'captain'
                if (!userId || !userType) return;

                if (userType === 'user') {
                    await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
                    socket.join(`user_${userId}`);
                    console.log(`[Socket.IO] Rider ${userId} joined room user_${userId}`);
                } else if (userType === 'captain') {
                    await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
                    socket.join(`captain_${userId}`);
                    console.log(`[Socket.IO] Captain ${userId} joined room captain_${userId}`);
                }
            } catch (err) {
                console.error('[Socket.IO] Join error:', err.message);
            }
        });

        socket.on('disconnect', async () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    return io;
}

function getIO() {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }
    return io;
}

function sendToUser(userId, event, data) {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
}

function sendToCaptain(captainId, event, data) {
    if (io) {
        io.to(`captain_${captainId}`).emit(event, data);
    }
}

function sendMessageToSocketId(socketId, messageObject) {
    if (io && socketId) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    }
}

module.exports = {
    initializeSocket,
    getIO,
    sendToUser,
    sendToCaptain,
    sendMessageToSocketId
};
