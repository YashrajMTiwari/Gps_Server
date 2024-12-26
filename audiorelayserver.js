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
      // Audio data received from Flutter device
      console.log('Received audio data');

      // Find associated client and forward the audio data
      for (const [deviceId, connection] of Object.entries(clients)) {
        if (connection.device === ws && connection.client) {
          connection.client.send(message); // Forward audio to the web client
        }
      }
    } else {
      try {
        const data = JSON.parse(message);

        if (data.device_id) {
          console.log(`Device ID ${data.device_id} registered`);
          // Store device connection
          if (!clients[data.device_id]) {
            clients[data.device_id] = { device: ws, client: null };
          }
          ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));
        }

        if (data.request_audio && data.device_id) {
          console.log(`Web client requesting audio from device ${data.device_id}`);
          // Register web client for this device
          if (clients[data.device_id]) {
            clients[data.device_id].client = ws;
          } else {
            ws.send(JSON.stringify({ error: 'Device not found' }));
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  });

  ws.on('close', () => {
    // Remove the connection when closed
    for (const [deviceId, connection] of Object.entries(clients)) {
      if (connection.device === ws || connection.client === ws) {
        delete clients[deviceId];
        console.log(`Connection closed for device ${deviceId}`);
      }
    }
  });
});
