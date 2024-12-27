const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(Server running on port ${port});
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

  ws.on('message', (message) => {
    try {
      console.log('Raw message received:', message.toString());
      const data = JSON.parse(message);

      if (data.device_id) {
        deviceId = data.device_id;
        if (data.isWebClient) {
          isWebClient = true;
          webClients[deviceId] = ws;
          console.log(Web client registered with device ID: ${deviceId});
          ws.send(JSON.stringify({ status: 'connected', message: Web client ${deviceId} registered. }));
        } else {
          clients[deviceId] = ws;
          console.log(Flutter device registered with device ID: ${deviceId});
          ws.send(JSON.stringify({ status: 'connected', message: Flutter device ${deviceId} registered. }));
        }
      }

      if (data.request_audio && data.flutter_device_id && isWebClient) {
        const flutterClient = clients[data.flutter_device_id];
        if (flutterClient) {
          flutterClient.send(JSON.stringify({ request_audio: true }));
          console.log(Audio request sent to Flutter device with device_id: ${data.flutter_device_id});
          ws.send(JSON.stringify({ status: 'audio_request_forwarded', flutter_device_id: data.flutter_device_id }));
        } else {
          console.log(No connected Flutter device for device_id: ${data.flutter_device_id});
          ws.send(JSON.stringify({ status: 'error', message: No Flutter device connected with device_id: ${data.flutter_device_id} }));
        }
      }

      if (data.audio_data && !isWebClient) {
        const webClient = webClients[deviceId];
        if (webClient) {
          webClient.send(JSON.stringify({ audio_data: data.audio_data }));
          console.log(Audio data sent to Web client with device_id: ${deviceId});
        } else {
          console.log(No Web client connected for device_id: ${deviceId});
        }
      }
    } catch (error) {
      console.error('Error parsing client message:', error);
      ws.send(JSON.stringify({ status: 'error', message: 'Failed to parse message', error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log(Connection closed for device_id: ${deviceId});
    if (deviceId) {
      if (isWebClient) {
        delete webClients[deviceId];
        console.log(Web client with device_id: ${deviceId} disconnected.);
      } else {
        delete clients[deviceId];
        console.log(Flutter device with device_id: ${deviceId} disconnected.);
      }
    }
  });

  ws.on('error', (err) => {
    console.error(WebSocket error for device_id: ${deviceId}:, err);
  });
})
