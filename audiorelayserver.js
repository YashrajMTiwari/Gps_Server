const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let clients = {}; // Track client connections: { deviceId: { device, client } }

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log('New connection established');

  ws.on('message', (message) => {
    if (Buffer.isBuffer(message)) {
      console.log('Received audio data');
    } else {
      try {
        const data = JSON.parse(message);
        console.log('Message from client:', data);

        if (data.device_id) {
          console.log(`Device ID registered: ${data.device_id}`);
          ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));
        }

        if (data.request_audio) {
          console.log('Audio request received from web client');
        }
      } catch (error) {
        console.error('Error parsing client message:', error);
      }
    }
  });
});

