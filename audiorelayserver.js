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
  // Handle the WebSocket upgrade request by calling handleUpgrade
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New device connected');

  // Extract device_id from query parameters
  const deviceId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('device_id');
  
  if (deviceId) {
    deviceConnections[deviceId] = ws;
    console.log(`Device ID ${deviceId} registered`);
    ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));

    // Check if there's an audio request for this device
    if (audioRequests[deviceId]) {
      ws.send(JSON.stringify({ request_audio: true }));
    }
  }

  // Handle incoming WebSocket messages from the client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.device_id) {
        deviceConnections[data.device_id] = ws;
        console.log(`Device ID ${data.device_id} registered`);
        ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));

        // If there's a pending audio request for the device, send it
        if (audioRequests[data.device_id]) {
          ws.send(JSON.stringify({ request_audio: true }));
        }
      }

      // Handle received audio data
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

  // Handle the WebSocket connection close event
  ws.on('close', () => {
    // Clean up device connections when a device disconnects
    for (let deviceId in deviceConnections) {
      if (deviceConnections[deviceId] === ws) {
        console.log(`Device ID ${deviceId} disconnected`);
        delete deviceConnections[deviceId];
        break;
      }
    }
  });
});

// Helper function to handle audio requests (to be used for testing purposes)
function handleAudioRequest(deviceId, ws) {
  audioRequests[deviceId] = ws;
  console.log(`Audio request registered for device ID ${deviceId}`);
}

