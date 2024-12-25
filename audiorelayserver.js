wss.on('connection', (ws) => {
  let deviceId = null;

  ws.on('message', (message) => {
    // Handle message as a string or buffer
    if (typeof message === 'string') {
      if (!deviceId) {
        // First message should be the device ID
        deviceId = message;
        devices[deviceId] = devices[deviceId] || [];
        console.log(`Device ${deviceId} connected.`);
        ws.send(`Welcome device ${deviceId}`);
      } else if (message.startsWith("REQUEST_AUDIO:")) {
        const requestedDeviceId = message.split(":")[1];
        console.log(`Audio stream requested for device: ${requestedDeviceId}`);
        if (devices[requestedDeviceId]) {
          devices[requestedDeviceId].push({ ws });
          ws.send(`Streaming audio for device: ${requestedDeviceId}`);
        } else {
          ws.send(`Device ${requestedDeviceId} is not available.`);
        }
      }
    } else if (Buffer.isBuffer(message)) {
      // Handle binary audio data
      if (deviceId) {
        console.log(`Received binary audio data from device ${deviceId}:`, message);

        // Broadcast binary data to all clients requesting this device's stream
        if (devices[deviceId]) {
          devices[deviceId].forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(message); // Forward raw audio data
            }
          });
        }
      } else {
        console.warn('Received binary data from an unidentified device.');
        ws.send('Device ID not set. Please send your device ID first.');
      }
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    if (deviceId) {
      devices[deviceId] = devices[deviceId].filter(client => client.ws !== ws);
      if (devices[deviceId].length === 0) {
        delete devices[deviceId];
      }
      console.log(`Device ${deviceId} disconnected.`);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.log(`Error on WebSocket: ${error}`);
  });
});
