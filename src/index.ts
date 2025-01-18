// server.js
import { Elysia } from 'elysia';
import { ElysiaWS } from 'elysia/dist/ws';
import { createClient } from 'redis';
import { cors } from '@elysiajs/cors';

// Create a Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
const redisPublisher = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Store active WebSocket connections
const connections = new Set<ElysiaWS>();

// Connect to Redis
await redisClient.connect();
await redisPublisher.connect();

// Subscribe to Redis for broadcast messages
redisClient.subscribe('refresh', (message) => {
  // Broadcast the message to all connected WebSocket clients
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
});

// Create an Elysia app
const app = new Elysia()
  .use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  }))
  .get('/', () => {
    return 'Hello, world!';
  })
  .post('/broadcast', () => {
    // Publish a "refresh" message to Redis
    console.log('Broadcast started');
    redisPublisher.publish('refresh', JSON.stringify({ type: 'refresh' }));
    console.log('Broadcast completed');
    return 'Broadcast triggered';
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
  .listen(9854, () => {
    console.log(`Server running on http://localhost:3000`);
  });