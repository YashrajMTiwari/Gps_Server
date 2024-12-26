const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Create the HTTP server that Express will listen to
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let deviceConnections = {};
let audioRequests = {};

// Upgrade HTTP request to WebSocket connection
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New device connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.device_id) {
        deviceConnections[data.device_id] = ws;
        console.log(`Device ID ${data.device_id} registered`);
        ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));

        if (audioRequests[data.device_id]) {
          ws.send(JSON.stringify({ request_audio: true }));
        }
      }

      if (data.audio_data) {
        console.log('Received audio data from device');
        if (audioRequests[data.device_id]) {
          audioRequests[data.device_id].send(data.audio_data);
        }
      }
    } catch (e) {
      console.error('Error processing message', e);
    }
  });

  ws.on('close', () => {
    for (let deviceId in deviceConnections) {
      if (deviceConnections[deviceId] === ws) {
        console.log(`Device ID ${deviceId} disconnected`);
        delete deviceConnections[deviceId];
        break;
      }
    }
  });
});
