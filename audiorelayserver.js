const WebSocket = require('ws');
const lame = require('lame');  // MP3 encoder
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

      // Convert PCM to MP3 and forward the audio data
      console.log(`Processing audio data from device ${deviceId}, streamId ${streamId}`);
      const mp3Buffer = pcmToMp3(message);

      // Forward the MP3 data to any connected client who requested this stream
      devices[deviceId].forEach(client => {
        if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(mp3Buffer);  // Send MP3 formatted audio data
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
  return Math.random().toString(36).substr(2, 9);
}

// Convert PCM buffer to MP3
function pcmToMp3(pcmBuffer) {
  return new Promise((resolve, reject) => {
    const encoder = new lame.Encoder({
      channels: 1,
      bitDepth: 16,
      sampleRate: 48000,
      bitRate: 128,
    });

    const chunks = [];
    encoder.on('data', (chunk) => {
      chunks.push(chunk);
    });

    encoder.on('error', (err) => {
      reject(err);
    });

    encoder.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    encoder.write(pcmBuffer);
    encoder.end();
  });
}

process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    process.exit(0);
  });
});
