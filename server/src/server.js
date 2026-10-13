import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import { connectDB } from './utils/connectDB.js';
import { setIO } from './utils/socket.js';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(x => x.trim()), credentials: true }
});
setIO(io);

io.on('connection', socket => {
  socket.on('authenticate', userId => {
    if (typeof userId === 'string' && userId.length < 100) socket.join(`user:${userId}`);
  });
});

const port = process.env.PORT || 5000;
connectDB().then(() => server.listen(port, () => console.log(`BloodBridge API listening on ${port}`)));
