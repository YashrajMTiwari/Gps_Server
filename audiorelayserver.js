const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let clients = {}; // { deviceId: WebSocket } - Flutter devices
let webClients = {}; // { deviceId: WebSocket } - Web clients

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  console.log('New WebSocket connection established');
  let deviceId = null;
  let isWebClient = false;

  ws.on('message', (message) => {
    if (Buffer.isBuffer(message)) {
      // Binary data from Flutter device (audio data)
      console.log(`Received audio data from Flutter client with device_id: ${deviceId}`);

      if (deviceId && webClients[deviceId]) {
        webClients[deviceId].send(message); // Forward audio to web client
        console.log(`Forwarded audio data to web client for device_id: ${deviceId}`);
      } else {
        console.log(`No web client connected for device_id: ${deviceId}`);
      }
    } else {
      // JSON message (text-based)
      try {
        const data = JSON.parse(message);
        console.log('Received message:', data);

        if (data.device_id) {
          deviceId = data.device_id;

          if (data.isWebClient) {
            // Register web client
            isWebClient = true;
            webClients[deviceId] = ws;
            console.log(`Web client registered with device_id: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', message: `Web client ${deviceId} registered.` }));
          } else {
            // Register Flutter device
            clients[deviceId] = ws;
            console.log(`Flutter device registered with device_id: ${deviceId}`);
            ws.send(JSON.stringify({ status: 'connected', message: `Flutter device ${deviceId} registered.` }));
          }
        }

        if (data.request_audio && isWebClient && deviceId) {
          // Web client requests audio from Flutter device
          const flutterClient = clients[deviceId];
          if (flutterClient) {
            flutterClient.send(JSON.stringify({ request_audio: true }));
            console.log(`Requested Flutter device ${deviceId} to start audio streaming.`);
          } else {
            console.log(`No Flutter device connected for device_id: ${deviceId}`);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });

  ws.on('close', () => {
    console.log(`Connection closed for device_id: ${deviceId}`);
    if (deviceId) {
      if (isWebClient) {
        delete webClients[deviceId];
        console.log(`Web client disconnected for device_id: ${deviceId}`);
      } else {
        delete clients[deviceId];
        console.log(`Flutter device disconnected for device_id: ${deviceId}`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`Error for device_id: ${deviceId}:`, error);
  });
});
