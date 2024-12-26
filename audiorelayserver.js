const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let flutterClients = {}; // Store Flutter device WebSocket connections by device_id
let webClients = {}; // Store WebSocket clients by device_id

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Handle new WebSocket connections
wss.on('connection', (ws, request) => {
  console.log('New connection established');
  let deviceId = null;
  let isWebClient = false;

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      // If the message is raw audio data (Buffer)
      if (Buffer.isBuffer(message)) {
        console.log(`Received audio data from Flutter client with device_id: ${deviceId}`);
        
        // Forward the audio data to the respective web client if a request exists
        if (deviceId && webClients[deviceId]) {
          webClients[deviceId].send(message);
          console.log(`Forwarding audio data to web client for device_id: ${deviceId}`);
        } else {
          console.log(`No web client connected for device_id: ${deviceId}`);
        }
      } else {
        // Parse JSON message
        console.log('Raw message received:', message.toString());
        const data = JSON.parse(message);

        // Handle device_id and registration
        if (data.device_id) {
          deviceId = data.device_id;
          console.log(`Device ID set to: ${deviceId}`);

          // Register as a Flutter device or a web client
          if (data.isWebClient) {
            isWebClient = true;
            webClients[deviceId] = ws; // Register as a web client
            console.log(`Web client registered with device ID: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', message: `Web client ${deviceId} registered.` }));
          } else {
            flutterClients[deviceId] = ws; // Register as a Flutter device
            console.log(`Flutter device registered with device ID: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', message: `Flutter device ${deviceId} registered.` }));
          }
        } else {
          console.warn('Message missing device_id:', data);
        }

        // Handle audio request from web client
        if (data.request_audio && deviceId && isWebClient) {
          const flutterClient = flutterClients[deviceId];
          if (flutterClient) {
            flutterClient.send(JSON.stringify({ request_audio: true }));
            console.log(`Audio request sent to Flutter device with device_id: ${deviceId}`);
          } else {
            console.log(`No connected Flutter device for device_id: ${deviceId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing client message:', error);
    }
  });

  // Handle WebSocket closure
  ws.on('close', () => {
    console.log(`Connection closed for device_id: ${deviceId}`);
    if (deviceId) {
      if (isWebClient) {
        delete webClients[deviceId];
        console.log(`Web client with device_id: ${deviceId} disconnected.`);
      } else {
        delete flutterClients[deviceId];
        console.log(`Flutter device with device_id: ${deviceId} disconnected.`);
      }
    }
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`WebSocket error for device_id: ${deviceId}:`, err);
  });
});

