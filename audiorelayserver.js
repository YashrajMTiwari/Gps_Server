const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

const devices = {};  // Stores device information and their connected clients

wss.on('connection', (ws) => {
    let deviceId = null;  // Store the device ID for each connection

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        // If the message is a string, it could be a device ID or a request for audio
        if (typeof message === 'string') {
            if (!deviceId) {
                // First message should be the device ID
                deviceId = message;
                devices[deviceId] = devices[deviceId] || [];
                console.log(`Device ${deviceId} connected.`);
                ws.send(`Welcome device ${deviceId}`);
            } else if (message.startsWith("REQUEST_AUDIO:")) {
                // If the message is a request for audio, handle it
                const requestedDeviceId = message.split(":")[1];
                console.log(`Audio stream requested for device: ${requestedDeviceId}`);

                // Check if the requested device has any connected clients
                if (devices[requestedDeviceId] && devices[requestedDeviceId].length > 0) {
                    devices[requestedDeviceId].push({ ws });  // Add the requesting client to the list
                    ws.send(`Streaming audio for device: ${requestedDeviceId}`);
                } else {
                    ws.send(`Device ${requestedDeviceId} is not available.`);
                }
            } else {
                console.log('Unexpected string message:', message);
            }
        } else if (Buffer.isBuffer(message)) {
            // If the message is binary (audio data)
            if (deviceId) {
                console.log(`Received binary audio data from device ${deviceId}. Broadcasting to clients...`);

                // Check if there are any clients that have requested this device's audio stream
                if (devices[deviceId]) {
                    devices[deviceId].forEach(client => {
                        if (client.ws.readyState === WebSocket.OPEN) {
                            client.ws.send(message);  // Forward the raw audio data to the requesting clients
                        }
                    });
                }
            } else {
                console.warn('Received binary data from an unidentified device.');
                ws.send('Device ID not set. Please send your device ID first.');
            }
        } else {
            console.log('Unknown message type received:', message);
        }
    });

    // Handle WebSocket disconnection
    ws.on('close', () => {
        if (deviceId) {
            // Remove this client from the list of connected clients for its device
            devices[deviceId] = devices[deviceId].filter(client => client.ws !== ws);
            
            // If there are no more clients for this device, remove it from the devices list
            if (devices[deviceId].length === 0) {
                delete devices[deviceId];
            }
            console.log(`Device ${deviceId} disconnected.`);
        }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.log(`Error on WebSocket: ${error}`);
    });
});

