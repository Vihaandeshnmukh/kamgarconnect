// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
// Socket.io will be attached to the server created by app.listen
let io;

// io placeholder for middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 3000;

// Basic Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Configure CORS for Split Architecture
app.use(cors({
  origin: ['https://kamgar.de', 'https://www.kamgar.de'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Setup Sockets function
const setupSockets = (socketServer) => {
  socketServer.on('connection', (socket) => {
    console.log('⚡ Socket client connected:', socket.id);
    
    socket.on('join-city', (city) => {
      socket.join(city);
      console.log(`Socket ${socket.id} joined city: ${city}`);
    });
    
    socket.on('subscribe-user', (userId) => {
      socket.join(`user-${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket client disconnected:', socket.id);
    });
  });
};

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Video Streaming Support from /videos directory
const streamVideo = (req, res, videoPath) => {
  if (!fs.existsSync(videoPath)) return res.status(404).send('Video not found');

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const file = fs.createReadStream(videoPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(videoPath).pipe(res);
  }
};

app.get('/videos/chowk.mp4', (req, res) => {
  streamVideo(req, res, path.join(__dirname, 'videos', 'chowk.mp4'));
});

app.get('/videos/home.mp4', (req, res) => {
  streamVideo(req, res, path.join(__dirname, 'videos', 'home.mp4'));
});

// Existing generic video route
app.get('/:filename.mp4', (req, res) => {
  streamVideo(req, res, path.join(__dirname, 'public', `${req.params.filename}.mp4`));
});

// Import API Routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/register', require('./routes/pitch'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/timeline', require('./routes/timeline'));

// Health Check for split frontend
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Explicit routes for pitch prototype pages
app.get('/register-worker', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register-worker.html'));
});
app.get('/register-employer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register-employer.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all: serve index.html for SPA-style routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`\n🔧 Kamgar Connect Backend is running on port ${PORT}\n`);
});

// Initialize Socket.io
io = new Server(server, {
  cors: {
    origin: ['https://kamgar.de', 'https://www.kamgar.de'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
setupSockets(io);
