const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - The HTTP server instance
 */
const initializeSocket = (httpServer) => {
  if (io) {
    console.log('⚠️ Socket.IO already initialized');
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:3000',
        'http://localhost:3011',
        'https://road-alert-git-main-markstephens-projects.vercel.app',
        'https://*.vercel.app',
        'https://road-alert-users.vercel.app',
        /\.vercel\.app$/
      ],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

    if (!token) {
      console.log('❌ Socket connection rejected: No token provided');
      return next(new Error('Authentication error'));
    }

    try {
      // Extract token from Bearer format if present
      const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      const decoded = jwt.verify(tokenString, process.env.JWT_SECRET || 'your-secret-key');
      
      // Attach admin info to socket
      socket.admin = {
        id: decoded.id || decoded.adminId,
        username: decoded.username,
        role: decoded.role
      };

      console.log(`✅ Socket authenticated: ${socket.admin.username} (${socket.admin.role})`);
      next();
    } catch (error) {
      console.log('❌ Socket connection rejected: Invalid token');
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Admin connected: ${socket.admin.username} (Socket ID: ${socket.id})`);

    // Join admin room for receiving notifications
    socket.join('admins');

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Admin disconnected: ${socket.admin.username} (Reason: ${reason})`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.admin.username}:`, error);
    });
  });

  console.log('✅ Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit new report event to all connected admins
 * @param {Object} report - The report object to emit
 */
const emitNewReport = (report) => {
  console.log("========== SOCKET DEBUG ==========");

  if (!io) {
    console.log("❌ io is NULL");
    return;
  }

  console.log("Connected clients:", io.engine.clientsCount);

  const adminsRoom = io.sockets.adapter.rooms.get("admins");

  console.log("Admins room:", adminsRoom);

  io.to("admins").emit("new_report", {
    _id: report._id,
    type: report.type,
    location: report.location,
    severity: report.severity,
    status: report.status,
    description: report.description,
    reportedBy: report.reportedBy,
    createdAt: report.createdAt,
    images: report.images
  });

  console.log("✅ new_report emitted");
  console.log("=================================");
};

module.exports = {
  initializeSocket,
  getIO,
  emitNewReport
};
