const WebSocket = require('ws');
const wav = require('wav'); // Install this with: npm install wav
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

// This object holds the active connections for each device
const devices = {};

wss.on('connection', (ws) => {
    let deviceId = null;

    ws.on('message', (message) => {
        if (typeof message === 'string') {
            const msg = message.trim();

            if (!deviceId) {
                // First message from a client should be the device ID
                deviceId = msg;
                devices[deviceId] = devices[deviceId] || [];
                devices[deviceId].push({ ws });
                console.log(`Device ${deviceId} connected.`);
                ws.send(`Welcome device ${deviceId}`);
            } else if (msg.startsWith("REQUEST_AUDIO:")) {
                // Handle audio stream request
                const requestedDeviceId = msg.split(":")[1];
                if (devices[requestedDeviceId]) {
                    console.log(`Audio stream requested for device: ${requestedDeviceId}`);
                    ws.send(`Streaming audio for device: ${requestedDeviceId}`);

                    // Simulate sending test audio data
                    const testAudioBuffer = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    const interval = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(testAudioBuffer);
                            console.log('Sent test binary audio data.');
                        } else {
                            clearInterval(interval);
                        }
                    }, 1000);
                } else {
                    ws.send(`Device ${requestedDeviceId} is not available.`);
                }
            } else {
                console.log('Unexpected string message received:', msg);
            }
        } else if (Buffer.isBuffer(message)) {
            // Received raw binary audio data
            console.log(`Received binary audio data from device ${deviceId}:`, message);

            // Broadcast the raw audio data to clients requesting this device's stream
            if (deviceId && devices[deviceId]) {
                devices[deviceId].forEach(client => {
                    if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
                        client.ws.send(message); // Forward the binary data
                    }
                });
            }
        } else {
            console.log('Unknown message type received.');
        }
    });

    // Handle client disconnections
    ws.on('close', () => {
        if (deviceId && devices[deviceId]) {
            devices[deviceId] = devices[deviceId].filter(client => client.ws !== ws);
            if (devices[deviceId].length === 0) {
                delete devices[deviceId];
            }
            console.log(`Device ${deviceId} disconnected.`);
        }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.log(`Error with device ${deviceId}:`, error);
    });
});

// Graceful server shutdown
process.on('SIGINT', () => {
    console.log('Shutting down WebSocket server...');
    wss.close(() => {
        process.exit(0);
    });
});
