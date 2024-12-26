const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let clients = {}; // Track Flutter client connections: { deviceId: WebSocket }
let webClients = {}; // Track WebSocket connections for web clients

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  console.log('New connection established');
  let deviceId = null;
  let isWebClient = false;

  // Handle WebSocket messages
  ws.on('message', (message) => {
    if (Buffer.isBuffer(message)) {
      // Handle binary data (audio data)
      console.log(`Received audio data from Flutter client with device_id: ${deviceId}`);

      if (deviceId && webClients[deviceId]) {
        webClients[deviceId].send(message); // Send audio to the web client
        console.log(`Forwarded audio data to web client for device_id: ${deviceId}`);
      } else {
        console.error(`No web client connected for device_id: ${deviceId}`);
      }
    } else {
      // Handle JSON messages
      try {
        const data = JSON.parse(message);

        if (data.device_id) {
          deviceId = data.device_id;
          console.log(`Device ID received and registered: ${deviceId}`);

          // Check if it's a Web client or Flutter client
          if (data.isWebClient) {
            isWebClient = true;
            webClients[deviceId] = ws;
            console.log(`Web client registered with device_id: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', device_id: deviceId }));
          } else {
            clients[deviceId] = ws;
            console.log(`Flutter device registered with device_id: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', device_id: deviceId }));
          }
        }

        // Handle audio request from a web client
        if (data.request_audio && isWebClient) {
          const flutterClient = clients[deviceId];
          if (flutterClient) {
            flutterClient.send(JSON.stringify({ request_audio: true }));
            console.log(`Audio request sent to Flutter device with device_id: ${deviceId}`);
          } else {
            console.error(`No connected Flutter device for device_id: ${deviceId}`);
          }
        }
      } catch (error) {
        console.error('Error parsing client message:', error);
      }
    }
  });

  // Handle connection closure
  ws.on('close', () => {
    console.log(`Connection closed for device_id: ${deviceId}`);
    if (deviceId) {
      if (isWebClient) {
        delete webClients[deviceId];
        console.log(`Web client with device_id: ${deviceId} disconnected.`);
      } else {
        delete clients[deviceId];
        console.log(`Flutter device with device_id: ${deviceId} disconnected.`);
      }
    }
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`WebSocket error for device_id: ${deviceId}:`, err);
  });
});
