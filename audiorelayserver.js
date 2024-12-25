const WebSocket = require('ws');
const opus = require('node-opus'); // Opus encoding library
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

const devices = {};

wss.on('connection', (ws) => {
  let deviceId = null;
  let streamId = null;

  ws.on('message', (message) => {
    const msg = message.toString();

    if (!deviceId) {
      deviceId = msg;
      devices[deviceId] = devices[deviceId] || [];
      console.log(`Device ${deviceId} connected.`);
      ws.send(`Welcome device ${deviceId}`);
    } else if (msg.startsWith("REQUEST_AUDIO:")) {
      const requestedDeviceId = msg.split(":")[1];
      if (devices[requestedDeviceId]) {
        devices[requestedDeviceId].forEach(client => {
          client.ws.send(`Streaming audio for device: ${requestedDeviceId}`);
        });
      } else {
        ws.send(`Device ${requestedDeviceId} is not available.`);
      }
    } else {
      if (!streamId) {
        streamId = generateStreamId();
        devices[deviceId].push({ streamId, ws });
        console.log(`New stream created for device ${deviceId} with streamId ${streamId}`);
      }

      // Encode raw PCM audio data to Opus
      const opusEncoder = new opus.Encoder(48000, 1); // 48kHz, mono
      const opusBuffer = opusEncoder.encode(message);

      // Forward the Opus audio data to any connected client
      devices[deviceId].forEach(client => {
        if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(opusBuffer);
        }
      });
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      devices[deviceId] = devices[deviceId].filter(stream => stream.ws !== ws);
      console.log(`Device ${deviceId} disconnected.`);
    }
  });

  ws.on('error', (error) => {
    console.log(`Error: ${error}`);
  });
});

function generateStreamId() {
  return Math.random().toString(36).substr(2, 9); // Random 9-character ID
}

process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    process.exit(0);
  });
});
