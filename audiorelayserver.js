const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

let devices = {};  // Store active devices and their streams
let receivers = {}; // Store active receivers and their WebSocket connections

wss.on('connection', (ws) => {
  console.log('New connection established');
  
  // Assign a unique ID to each connection
  ws.id = Math.random().toString(36).substr(2, 9);  // Simple random id generator

  // Handle incoming messages from clients (offer/answer)
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // When a device sends an offer (with device_id)
    if (data.type === 'offer') {
      const deviceId = data.device_id;
      devices[deviceId] = ws;  // Register the device with its WebSocket connection
      console.log(`Device registered with ID: ${deviceId}`);
      
      // Forward the offer to the target receiver if any (if a receiver is listening for this device)
      if (receivers[deviceId]) {
        receivers[deviceId].send(JSON.stringify({
          type: 'audio_offer',
          device_id: deviceId,
          from: ws.id,  // Send the device's connection ID
        }));
      }
    }

    // When a receiver requests a device's audio
    if (data.type === 'request_audio') {
      const targetDeviceId = data.device_id;
      const targetDevice = devices[targetDeviceId];

      if (targetDevice) {
        // Register the receiver (who is requesting the audio) for the specific device
        receivers[targetDeviceId] = ws;
        console.log(`Receiver registered to receive audio from device ${targetDeviceId}`);

        // Inform the device to start streaming to this receiver
        targetDevice.send(JSON.stringify({
          type: 'audio_request',
          from: ws.id,  // Send the receiver's ID
        }));
      } else {
        // If device is not available, inform the receiver
        ws.send(JSON.stringify({
          type: 'error',
          message: `Device with ID ${targetDeviceId} not found`,
        }));
      }
    }

    // Forward audio data from device to the connected receiver
    if (data.type === 'audio_data' && data.device_id) {
      const targetReceiver = receivers[data.device_id];

      if (targetReceiver) {
        // Send the audio data to the specific receiver
        targetReceiver.send(JSON.stringify({
          type: 'audio_stream',
          device_id: data.device_id,
          audio_data: data.audio_data,  // Forward the audio data as received
        }));
      } else {
        console.log(`No receiver found for device ID ${data.device_id}`);
      }
    }
  });

  // Handle disconnects
  ws.on('close', () => {
    console.log(`Connection closed: ${ws.id}`);
    
    // Clean up when device disconnects
    for (const deviceId in devices) {
      if (devices[deviceId] === ws) {
        console.log(`Device with ID ${deviceId} disconnected`);
        delete devices[deviceId];
        break;
      }
    }

    // Clean up when receiver disconnects
    for (const deviceId in receivers) {
      if (receivers[deviceId] === ws) {
        console.log(`Receiver disconnected from device ${deviceId}`);
        delete receivers[deviceId];
        break;
      }
    }
  });
});

console.log('Signaling server running on ws://localhost:8080');
