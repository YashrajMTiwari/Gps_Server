const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let clients = {}; // Track client connections: { deviceId: WebSocket }

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  console.log('New connection established');
  let deviceId = null;

  ws.on('message', (message) => {
    if (Buffer.isBuffer(message)) {
      console.log('Received audio data from client');
    } else {
      try {
        const data = JSON.parse(message);
        console.log('Message from client:', data);

        if (data.device_id) {
          deviceId = data.device_id;
          clients[deviceId] = ws; // Register the client
          ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));
          console.log(`Device ID registered: ${deviceId}`);
        }

        if (data.request_audio && deviceId) {
          // Forward the request to the corresponding Flutter app
          const client = clients[deviceId];
          if (client) {
            client.send(JSON.stringify({ request_audio: true }));
            console.log('Audio request forwarded to Flutter app');
          } else {
            console.log('No connected Flutter app for device_id:', deviceId);
          }
        }
      } catch (error) {
        console.error('Error parsing client message:', error);
      }
    }
  });

  ws.on('close', () => {
    console.log(`Connection closed for device_id: ${deviceId}`);
    if (deviceId) {
      delete clients[deviceId];
    }
  });
});
