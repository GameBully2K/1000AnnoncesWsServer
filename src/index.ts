// server.js
import { Elysia } from 'elysia';
import { ElysiaWS } from 'elysia/dist/ws';
import { cors } from '@elysiajs/cors';

// Store active WebSocket connections
const connections = new Set<ElysiaWS>();

// Create an Elysia app
const app = new Elysia()
.use(cors(
  // Allow all origins
  {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
   }
))
.get('/', () => {
  return 'Hello, world!';
})
.ws('/ws', {
  open(ws) {
    console.log('New WebSocket connection');
    connections.add(ws);
  },
  message(ws, message) {
    console.log('Received message:', message);
  },
  close(ws) {
    console.log('WebSocket connection closed');
    connections.delete(ws);
  },
})
.post('/broadcast', () => {
  // Broadcast a "refresh" message to all connected clients
  const message = JSON.stringify({ type: 'refresh' });
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
  return 'Broadcast triggered';
})
.listen(parseInt(process.env.PORT || "3000"), () => {
  console.log(`Server running on http://localhost:${(process.env.PORT || "3000")}`);
});