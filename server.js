const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const admin = 'admin bot';

const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomsUsers } = require('./utils/users');

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Run when client connects
io.on('connection', (socket) => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome Current User - message sent to user client only
    socket.emit('message', formatMessage(admin, 'Welcome to ChatCord!'));

    //Broadcast to all other users clients
    socket.broadcast.to(user.room).emit('message', formatMessage(admin, `${user.username} has joined the chat`));

    // send users and room info

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomsUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit('message', formatMessage(admin, `${user.username} has left the chat`));

      // send users and room info

      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomsUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
