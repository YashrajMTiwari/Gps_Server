const WebSocket = require('ws');
const express = require('express');

// Create an Express app for HTTP requests (optional)
const app = express();
const port = process.env.PORT || 3000;

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Store device connections and device ID mappings
let deviceConnections = {};
let audioRequests = {};

wss.on('connection', (ws, req) => {
  console.log('New device connected');

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle device ID registration
      if (data.device_id) {
        deviceConnections[data.device_id] = ws;
        console.log(`Device ID ${data.device_id} registered`);
        ws.send(JSON.stringify({ status: 'connected', message: 'Device registered' }));

        // Check if there's an audio request for this device
        if (audioRequests[data.device_id]) {
          ws.send(JSON.stringify({ request_audio: true }));
        }
      }

      // Handle audio data stream from devices
      if (data.audio_data) {
        console.log('Received raw audio data from device');
        // Here, we can process the raw audio data or forward it to the user

        // For now, send audio data to a user that has requested it
        if (audioRequests[data.device_id]) {
          audioRequests[data.device_id].send(data.audio_data);
        }
      }
    } catch (e) {
      console.error('Error processing message', e);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Handle closing the connection
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

// Create an HTTP server and handle WebSocket upgrade requests
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Function to request audio from a specific device (called from a user request)
function requestAudioFromDevice(deviceId, ws) {
  if (deviceConnections[deviceId]) {
    audioRequests[deviceId] = ws;
    console.log(`Audio request received for device ${deviceId}. Requesting audio...`);
    deviceConnections[deviceId].send(JSON.stringify({ request_audio: true }));
  } else {
    ws.send(JSON.stringify({ error: 'Device not connected or available' }));
  }
}

// Example route to simulate a user requesting audio
app.get('/request-audio/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  // Create a WebSocket connection to the actual server where devices are connected
  const userWs = new WebSocket(`ws://audio-server-9xh3.onrender.com`); // Correct URL of the server
  
  userWs.on('open', () => {
    requestAudioFromDevice(deviceId, userWs);
    res.send('Audio request sent to device');
  });

  userWs.on('message', (message) => {
    console.log('Received audio data from device:', message);
    // Process or forward the audio data as needed
  });

  userWs.on('error', (error) => {
    console.error('Error in WebSocket client:', error);
  });
});
