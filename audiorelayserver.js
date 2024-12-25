// Import the WebSocket library
const WebSocket = require('ws');

// Initialize the WebSocket server
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

// Keep track of connected devices
const devices = {};

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
    let deviceId = null;  // Device ID will be assigned after the first message
    console.log('A new client connected.');

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        if (typeof message === 'string') {
            // Handle string messages, such as device ID or audio requests
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
            } else {
                console.log('Unexpected string message:', message);
            }
        } else if (Buffer.isBuffer(message)) {
            // Handle binary audio data
            if (deviceId) {
                console.log(`Received binary audio data from device ${deviceId}:`, message);

                // Broadcast the binary data to all clients requesting this device's stream
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
        } else {
            console.log('Unknown message type received:', message);
        }
    });

    // Handle WebSocket disconnections
    ws.on('close', () => {
        if (deviceId) {
            devices[deviceId] = devices[deviceId].filter(client => client.ws !== ws);
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
