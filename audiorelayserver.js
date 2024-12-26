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

  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      // Log the incoming message for debugging
      console.log('Raw message received:', message.toString());

      // Parse the incoming message
      const data = JSON.parse(message);

      // Check if the message contains device_id
      if (data.device_id) {
        deviceId = data.device_id;
        console.log(`Device ID set to: ${deviceId}`);

        // Register as Flutter device or Web client
        if (data.isWebClient) {
          isWebClient = true;
          webClients[deviceId] = ws; // Register as web client
          console.log(`Web client registered with device ID: ${deviceId}`);
          // Send connected message to Web client
          ws.send(JSON.stringify({ status: 'connected', message: `Web client ${deviceId} registered.` }));
        } else {
          clients[deviceId] = ws; // Register as Flutter device
          console.log(`Flutter device registered with device ID: ${deviceId}`);
          // Send connected message to Flutter device
          ws.send(JSON.stringify({ status: 'connected', message: `Flutter device ${deviceId} registered.` }));
        }
      } else {
        console.log('Device ID missing in message');
        // Handle missing device_id (could send an error response)
        ws.send(JSON.stringify({ status: 'error', message: 'Device ID is required' }));
      }

      // Handle audio request from Web client
      if (data.request_audio && deviceId && isWebClient) {
        const flutterClient = clients[deviceId];
        if (flutterClient) {
          flutterClient.send(JSON.stringify({ request_audio: true }));
          console.log(`Audio request sent to Flutter device with device_id: ${deviceId}`);
        } else {
          console.log(`No connected Flutter device for device_id: ${deviceId}`);
        }
      }
    } catch (error) {
      console.error('Error parsing client message:', error);
      ws.send(JSON.stringify({ status: 'error', message: 'Failed to parse message' }));
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
