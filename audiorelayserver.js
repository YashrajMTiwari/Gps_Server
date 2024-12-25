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
            console.log(`Audio stream requested for device: ${requestedDeviceId}`);
            ws.send(`Streaming audio for device: ${requestedDeviceId}`);
        } else {
            ws.send(`Device ${requestedDeviceId} is not available.`);
        }
    } else if (Buffer.isBuffer(message)) {
        // **This is the raw audio data.**
        console.log('Received binary audio data:', message);
        
        // Broadcast to all clients requesting this device's stream
        if (devices[deviceId]) {
            devices[deviceId].forEach(client => {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(message); // Forward raw audio data
                }
            });
        }
    } else {
        console.log('Unexpected message received:', msg);
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
