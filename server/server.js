const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });
const { connectDB } = require('./config/database');
const config = require('./config/config');
const { setupSocket } = require('./socket/index');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const callRoutes = require('./routes/calls');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Clone API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      messages: '/api/messages',
      calls: '/api/calls',
      upload: '/api/upload',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

app.get('/api/turn-credentials', (req, res) => {
  res.json({
    urls: config.turnServer.urls,
    username: config.turnServer.username,
    credential: config.turnServer.credential,
  });
});

app.set('io', io);
setupSocket(io);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = config.port;

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();
