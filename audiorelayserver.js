const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let clients = {}; // Store WebSocket connections for Flutter devices
let webClients = {}; // Store WebSocket connections for Web clients

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
    try {
      // Log the raw message to help debug the issue
      console.log('Raw message received:', message.toString());

      // Parse the incoming message as JSON
      const data = JSON.parse(message);

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
        // Handle missing device_id (send an error response)
        ws.send(JSON.stringify({ status: 'error', message: 'Device ID is required' }));
      }

      // Handle audio request from Web client
      if (data.request_audio && data.flutter_device_id && isWebClient) {
        const flutterClient = clients[data.flutter_device_id]; // Retrieve Flutter device from clients
        if (flutterClient) {
          flutterClient.send(JSON.stringify({ request_audio: true }));
          console.log(`Audio request sent to Flutter device with device_id: ${data.flutter_device_id}`);
        } else {
          console.log(`No connected Flutter device for device_id: ${data.flutter_device_id}`);
        }
      }

      // Handle audio data from Flutter device
      if (data.audio_data && !isWebClient) {
        const webClient = webClients[deviceId];  // Find the corresponding Web client
        if (webClient) {
          webClient.send(JSON.stringify({ audio_data: data.audio_data }));
          console.log(`Audio data sent to Web client with device_id: ${deviceId}`);
        } else {
          console.log(`No Web client connected for device_id: ${deviceId}`);
        }
      }

    } catch (error) {
      console.error('Error parsing client message:', error);
      // Send an error message to the client
      ws.send(JSON.stringify({ status: 'error', message: 'Failed to parse message', error: error.message }));
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
