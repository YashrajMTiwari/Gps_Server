const WebSocket = require('ws');
const wav = require('wav'); // Install this with: npm install wav
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

// This object holds the active streams (audio data) for each device
const devices = {};

wss.on('connection', (ws) => {
  let deviceId = null;
  let streamId = null; // Unique stream identifier per device

  // Handle incoming messages (audio data or requests)
  ws.on('message', (message) => {
    const msg = message.toString();

    if (!deviceId) {
      // The first message should be the device ID
      deviceId = msg;
      devices[deviceId] = devices[deviceId] || [];
      console.log(`Device ${deviceId} connected.`);
      ws.send(`Welcome device ${deviceId}`);
    } else if (msg.startsWith("REQUEST_AUDIO:")) {
      // Handle audio stream request
      const requestedDeviceId = msg.split(":")[1];
      if (devices[requestedDeviceId]) {
        // Device is available, start streaming audio to the client
        devices[requestedDeviceId].forEach(client => {
          client.ws.send(`Streaming audio for device: ${requestedDeviceId}`);
        });
      } else {
        // Device is not available, notify client
        ws.send(`Device ${requestedDeviceId} is not available.`);
      }
    } else {
      // Audio data message: forward it to the requesting client
      if (!streamId) {
        // Create a unique stream ID for this session
        streamId = generateStreamId();
        devices[deviceId].push({ streamId, ws });
        console.log(`New stream created for device ${deviceId} with streamId ${streamId}`);
      }

      // Debug log to check raw audio data received
      console.log('Received audio data:', msg);

      // Check if the received message is PCM data, then process and send
      if (isValidAudioData(msg)) {
        // Convert PCM to WAV and forward the audio data
        console.log(`Processing audio data from device ${deviceId}, streamId ${streamId}`);
        const wavBuffer = pcmToWav(msg);

        // Forward the WAV data to any connected client who requested this stream
        devices[deviceId].forEach(client => {
          if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(wavBuffer); // Send WAV formatted audio data
          }
        });
      } else {
        console.log('Invalid audio format received or no PCM data');
      }
    }
  });

  // Handle disconnections
  ws.on('close', () => {
    if (deviceId) {
      // Remove the device's stream(s) from the list
      devices[deviceId] = devices[deviceId].filter(stream => stream.ws !== ws);
      console.log(`Device ${deviceId} disconnected.`);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.log(`Error: ${error}`);
  });
});

// Helper function to generate a unique stream ID
function generateStreamId() {
  return Math.random().toString(36).substr(2, 9); // Random 9-character ID
}

// Helper function to convert raw PCM to WAV
function pcmToWav(pcmBuffer) {
  const writer = new wav.Writer({
    channels: 1,
    sampleRate: 48000,
    bitDepth: 16,
  });

  // Create a buffer that contains the WAV header + PCM data
  const chunks = [];
  writer.on('data', (chunk) => {
    chunks.push(chunk);
  });

  writer.end(pcmBuffer);
  return Buffer.concat(chunks);
}

// Helper function to validate PCM data
function isValidAudioData(data) {
  // Here we check if the data is valid PCM. This is just a placeholder.
  // You could enhance this function based on your PCM data format.
  return data && data.length > 0;
}

// To gracefully handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    process.exit(0);
  });
});
