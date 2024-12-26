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
    try {
      // Log received message
      console.log('Raw message received:', message.toString());

      // If the message is raw audio data (Buffer)
      if (Buffer.isBuffer(message)) {
        console.log(`Received audio data from Flutter client with device_id: ${deviceId}`);
        
        // Forward audio data to the respective web client if device_id exists
        if (deviceId && webClients[deviceId]) {
          webClients[deviceId].send(message);
          console.log(`Forwarding audio data to web client for device_id: ${deviceId}`);
        } else {
          console.log(`No web client connected for device_id: ${deviceId}`);
        }
      } else {
        // Parse JSON message
        const data = JSON.parse(message);
        console.log('Parsed message:', data);

        // Handle device_id setup (this ensures deviceId is set properly)
        if (data.device_id) {
          if (!deviceId) {
            deviceId = data.device_id;  // Assign deviceId
            console.log(`Device ID set to: ${deviceId}`);
          }

          // Register as web client or flutter device
          if (data.isWebClient) {
            isWebClient = true;
            webClients[deviceId] = ws; // Register this connection as a web client
            console.log(`Web client registered with device ID: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', message: `Web client ${deviceId} registered.` }));
          } else {
            clients[deviceId] = ws; // Register this connection as a Flutter device
            console.log(`Flutter device registered with device ID: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', message: `Flutter device ${deviceId} registered.` }));
          }
        } else {
          console.warn('Message missing device_id:', data);
        }

        // Handle audio request from web client
        if (data.request_audio && deviceId && isWebClient) {
          const flutterClient = clients[deviceId];
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


