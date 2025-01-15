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

    // Store connected users and sessions
    const connectedUsers = new Map();
    const chatSessions = new Map();

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

    io.on('connection', async (socket) => {
      try {
        // Add user to connected users
        // @ts-ignore
        connectedUsers.set(socket.user.id, {
          // @ts-ignore
          id: socket.user.id,
          // @ts-ignore
          username: socket.user.username,
          socketId: socket.id
        });

        // Send welcome message
        // @ts-ignore
        socket.emit('welcome', { text: `Welcome ${socket.user.username}!` });

        // Broadcast updated user list
        io.emit('userList', {
          users: Array.from(connectedUsers.values())
        });

        // Handle creating new chat session
        socket.on('createSession', (sessionData) => {
          const sessionId = Date.now().toString();
          chatSessions.set(sessionId, {
            id: sessionId,
            name: sessionData.name,
            // @ts-ignore
            createdBy: socket.user.id,
            messages: []
          });
          
          socket.emit('sessionCreated', {
            sessionId,
            name: sessionData.name
          });
        });

        // Handle session messages
        socket.on('sendMessage', (data) => {
          const session = chatSessions.get(data.sessionId);
          if (session) {
            const message = {
              text: data.text,
              sessionId: data.sessionId,
              // @ts-ignore
              senderId: socket.user.id,
              // @ts-ignore
              senderUsername: socket.user.username,
              timestamp: Date.now()
            };
            
            session.messages.push(message);
            io.emit('message', message);
          }
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
          // @ts-ignore
          connectedUsers.delete(socket.user.id);
          io.emit('userList', {
            users: Array.from(connectedUsers.values())
          });
        });

      } catch (error) {
        console.error('Socket connection error:', error);
      }
    });
  },
};