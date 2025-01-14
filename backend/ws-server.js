const WebSocket = require('ws');
const jwt = require('jsonwebtoken'); // Make sure you have 'jsonwebtoken' installed

module.exports = ({ strapi }) => {
  const wss = new WebSocket.Server({ port: 1337 });

  wss.on('connection', (ws, req) => {
    // Extract the JWT token from the query string
    const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
    
    if (!token) {
      ws.close();
      console.log('No token provided');
      return;
    }

    // Verify and decode the JWT token
    jwt.verify(token, strapi.config.get('app.keys')[0], (err, decoded) => {
      if (err) {
        ws.close();
        console.log('Token verification failed');
        return;
      }

      console.log('User connected with ID:', decoded.id);

      // Handle messages
      ws.on('message', message => {
        console.log('received:', message);
        // Broadcast to all connected clients (for now)
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  });
};
