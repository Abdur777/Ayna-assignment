module.exports = {
  register({ strapi }) {
    const { Server } = require('socket.io');
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        allowedHeaders: ["Authorization"],
        credentials: true
      }
    });

    // Store connected users
    const connectedUsers = new Map();

    // Middleware to verify JWT token
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.query.token;
        if (!token) {
          throw new Error('Authentication token missing');
        }

        // Verify JWT token using Strapi's service
        const { id } = await strapi.plugins['users-permissions'].services.jwt.verify(token);
        const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { id } });
        
        if (!user) {
          throw new Error('User not found');
        }

        // Attach user to socket
        // @ts-ignore
        socket.user = user;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      // @ts-ignore
      const userId = socket.user.id;
      connectedUsers.set(userId, {
        socket: socket,
        // @ts-ignore
        user: socket.user
      });

      // Emit welcome message
      socket.emit('welcome', {
        // @ts-ignore
        text: `Welcome ${socket.user.username}!`
      });

      // Emit updated user list to all clients
      io.emit('userList', {
        users: Array.from(connectedUsers.values()).map(u => ({
          id: u.user.id,
          username: u.user.username
        }))
      });

      // Handle private messages
      socket.on('sendMessage', (message) => {
        // Check if recipient exists and is connected
        const recipientConnection = connectedUsers.get(message.recipientId);
        if (!recipientConnection) {
          socket.emit('messageError', {
            error: 'Recipient not found or offline'
          });
          return;
        }

        const enhancedMessage = {
          // @ts-ignore
          senderId: socket.user.id,
          // @ts-ignore
          senderUsername: socket.user.username,
          recipientId: message.recipientId,
          text: message.text,
          timestamp: new Date()
        };
      // @ts-ignore
        if (socket.user.id !== message.recipientId) {
          recipientConnection.socket.emit('message', enhancedMessage);
        }
        socket.emit('message', enhancedMessage);
      });

      // Handle typing events
      socket.on('typing', (recipientId) => {
        const recipientConnection = connectedUsers.get(recipientId);
        if (recipientConnection) {
          recipientConnection.socket.emit('typing', {
            // @ts-ignore
            username: socket.user.username,
            // @ts-ignore
            userId: socket.user.id
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        connectedUsers.delete(userId);
        io.emit('userList', {
          users: Array.from(connectedUsers.values()).map(u => ({
            id: u.user.id,
            username: u.user.username
          }))
        });
      });
    });
  },
};