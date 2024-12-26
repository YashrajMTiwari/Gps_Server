const WebSocket = require('ws');
const express = require('express');
const fs = require('fs'); // Assuming you may want to send a static audio file

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
    // Check if the message is a Buffer (binary audio data) or JSON
    if (Buffer.isBuffer(message)) {
      console.log('Received audio data');
      // Process and handle the audio data here (e.g., save it, send it back, etc.)
      ws.send(message);  // Echo the received audio data back to the client as an example
    } else {
      try {
        const data = JSON.parse(message);

        if (data.device_id) {
          console.log(`Device ID ${data.device_id} registered`);
          ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));

          // Handle the audio request from the client
          if (data.request_audio === true) {
            console.log('Audio request received, ready to send audio data');
          }
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    }
  });

  ws.on('close', () => {
    console.log('Device disconnected');
  });
});
