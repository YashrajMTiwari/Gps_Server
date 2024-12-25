const WebSocket = require('ws');
const wav = require('wav'); // Install this with: npm install wav
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

const devices = {};

wss.on('connection', (ws) => {
    let deviceId = null;

    ws.on('message', (message) => {
        const msg = message.toString();

        if (!deviceId) {
            // First message should be the device ID
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
            if (Buffer.isBuffer(msg)) {
                // Send raw binary audio data (WAV or PCM)
                ws.send(msg);
            } else {
                console.log('Expected binary, but received:', msg);
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
