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

  // Identify if the connection is from a web client or a Flutter device
  ws.on('message', (message) => {
    if (Buffer.isBuffer(message)) {
      console.log('Received audio data from Flutter client');
      
      // If it's audio data, forward it to the respective web client
      if (deviceId && webClients[deviceId]) {
        webClients[deviceId].send(message); // Send audio to the web client
        console.log('Forwarding audio data to web client');
      }
    } else {
      try {
        const data = JSON.parse(message);
        console.log('Message from client:', data);

        if (data.device_id) {
          deviceId = data.device_id;

          // Check if it's a Flutter device or a web client
          if (data.isWebClient) {
            isWebClient = true;
            webClients[deviceId] = ws; // Register this connection as a web client
            console.log(`Web client registered with device ID: ${deviceId}`);
          } else {
            clients[deviceId] = ws; // Register Flutter device
            console.log(`Flutter device registered with device ID: ${deviceId}`);
          }

          // Send confirmation to the device or web client
          ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));
        }

        if (data.request_audio && deviceId && isWebClient) {
          // Web client requests audio from Flutter device
          const flutterClient = clients[deviceId];
          if (flutterClient) {
            flutterClient.send(JSON.stringify({ request_audio: true }));
            console.log('Audio request sent to Flutter app');
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
      if (isWebClient) {
        delete webClients[deviceId]; // Remove the web client connection
      } else {
        delete clients[deviceId]; // Remove the Flutter device connection
      }
    }
  });
});
