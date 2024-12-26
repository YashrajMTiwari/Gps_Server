const WebSocket = require('ws');
const express = require('express');
const fs = require('fs'); // Assuming you're sending an audio file

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

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
        console.log(`Device ID ${data.device_id} registered`);
        ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));

        // Simulate sending audio data after device registration
        if (data.request_audio) {
          // Example: Read an audio file and send it as a binary Buffer
          fs.readFile('path/to/audio/file.mp3', (err, audioData) => {
            if (err) {
              console.error('Error reading audio file:', err);
            } else {
              // Send audio data as binary
              ws.send(audioData);
            }
          });
        }
      }
    } catch (e) {
      console.error('Error processing message', e);
    }
  });

  ws.on('close', () => {
    console.log('Device disconnected');
  });
});
