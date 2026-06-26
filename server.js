const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let waitingUsers = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('findMatch', () => {
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.pop();
      const room = socket.id + partner.id;
      
      socket.join(room);
      partner.join(room);
      
      socket.emit('matchFound', { room, partnerId: partner.id });
      partner.emit('matchFound', { room, partnerId: socket.id });
    } else {
      waitingUsers.push(socket);
      socket.emit('waiting');
    }
  });

  socket.on('signal', (data) => {
    socket.to(data.room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    const index = waitingUsers.indexOf(socket);
    if (index !== -1) waitingUsers.splice(index, 1);
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('Server running on port 5000');
});
