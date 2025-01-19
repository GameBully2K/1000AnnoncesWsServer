// server.js
import { Elysia } from 'elysia';
import { ElysiaWS } from 'elysia/dist/ws';
import { createClient } from 'redis';
import { cors } from '@elysiajs/cors';

const retryStrategy = {
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      // End reconnecting on a specific error
      console.error('Redis connection refused, retrying...');
      return Math.min(options.attempt * 100, 3000);
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout
      return new Error('Retry time exhausted');
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

// Create a Redis client with retry strategy
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: retryStrategy
  }
});

const redisPublisher = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: retryStrategy
  }
});

// Add error handlers
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisPublisher.on('error', (err) => console.error('Redis Publisher Error:', err));

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