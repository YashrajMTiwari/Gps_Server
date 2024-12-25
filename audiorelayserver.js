const WebSocket = require('ws');
const wav = require('wav'); // Install this with: npm install wav
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

// This object holds the active streams (audio data) for each device
const devices = {};

wss.on('connection', (ws) => {
  let deviceId = null;
  let streamId = null; // Unique stream identifier per device

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
      console.log(`Received audio data (size: ${msg.length} bytes)`);

      if (isValidAudioData(msg)) {
        // Convert PCM to WAV (stereo) and forward the audio data
        console.log(`Processing audio data from device ${deviceId}, streamId ${streamId}`);
        const wavBuffer = pcmToWav(Buffer.from(msg), 2); // Specify 2 channels (stereo)

        if (wavBuffer && wavBuffer.length > 0) {
          // Forward the WAV data to any connected client who requested this stream
          devices[deviceId].forEach(client => {
            if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(wavBuffer); // Send WAV formatted audio data
            }
          });
        } else {
          console.log("WAV conversion resulted in an empty buffer. Skipping forwarding.");
        }
      } else {
        console.log('Invalid audio format received or no PCM data');
      }
    }
  });

  // Handle disconnections
  ws.on('close', () => {
    if (deviceId) {
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
function pcmToWav(pcmBuffer, numChannels) {
  if (!pcmBuffer || pcmBuffer.length === 0) {
    console.log("Received empty PCM buffer. Skipping WAV conversion.");
    return null;
  }

  const writer = new wav.Writer({
    channels: numChannels, // Use 2 for stereo
    sampleRate: 48000, // Match the sample rate used in your app
    bitDepth: 16,
  });

  const chunks = [];
  writer.on('data', (chunk) => {
    chunks.push(chunk);
  });

  writer.end(pcmBuffer);

  if (chunks.length === 0) {
    console.log("WAV conversion produced no output.");
    return null;
  }

  return Buffer.concat(chunks);
}

// Helper function to validate PCM data
function isValidAudioData(data) {
  return data && data.length > 0; // Validate non-empty buffer
}

// To gracefully handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    process.exit(0);
  });
});
