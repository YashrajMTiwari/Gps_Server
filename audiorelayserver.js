const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

let devices = {};  // Store active devices and their streams

wss.on('connection', (ws) => {
  console.log('New connection established');
  
  // Handle incoming messages from clients (offer/answer)
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // When a device sends an offer (with device_id)
    if (data.type === 'offer') {
      const deviceId = data.device_id;
      devices[deviceId] = ws;  // Register the device with its WebSocket connection
      
      // Forward the offer to the target receiver
      // In a real application, you'd store device streams or forward SDP/ICE candidates appropriately
    }

    // When a receiver requests a device's audio
    if (data.type === 'request_audio') {
      const targetDeviceId = data.device_id;
      const targetDevice = devices[targetDeviceId];

      if (targetDevice) {
        // Forward the offer to the specific device
        targetDevice.send(JSON.stringify({
          type: 'audio_request',
          from: ws.id,  // Send the receiver's id
        }));
      }
    }
  });
  
  // Handle disconnects
  ws.on('close', () => {
    // Clean up when device disconnects
    for (const deviceId in devices) {
      if (devices[deviceId] === ws) {
        delete devices[deviceId];
        break;
      }
    }
  });
});

console.log('Signaling server running on ws://localhost:8080');
