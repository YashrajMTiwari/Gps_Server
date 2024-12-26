const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

const devices = {};
const clients = {};

wss.on('connection', (ws) => {
    let deviceId = null;  // Device ID will be assigned after the first message
    console.log('A new client connected.');

    ws.on('message', (message) => {
        if (typeof message === 'string') {
            if (message.startsWith('REQUEST_AUDIO:')) {
                // Handle client requests for audio
                const requestedDeviceId = message.split(':')[1];
                console.log(`Client requested audio for device ${requestedDeviceId}`);

                if (!devices[requestedDeviceId]) {
                    ws.send('Device not connected.');
                } else {
                    // Store the client connection for this device
                    clients[requestedDeviceId] = clients[requestedDeviceId] || [];
                    clients[requestedDeviceId].push({ ws });

                    // Notify the device to start sending audio
                    devices[requestedDeviceId].ws.send('START_AUDIO');
                }
            } else if (!deviceId) {
                // First message from a device should be its ID
                deviceId = message;
                devices[deviceId] = { ws };
                console.log(`Device ${deviceId} connected.`);
                ws.send(`Welcome device ${deviceId}`);
            } else {
                console.log('Unexpected message:', message);
            }
        } else if (Buffer.isBuffer(message)) {
            // Handle binary audio data
            if (deviceId && clients[deviceId]) {
                console.log(`Received binary audio data from device ${deviceId}`);

                // Relay audio data to all clients requesting this device's stream
                clients[deviceId].forEach(client => {
                    if (client.ws.readyState === WebSocket.OPEN) {
                        client.ws.send(message);
                    }
                });
            } else {
                console.warn('Received binary data from an unidentified or unrequested device.');
            }
        }
    });

    ws.on('close', () => {
        if (deviceId) {
            delete devices[deviceId];
            delete clients[deviceId];
            console.log(`Device ${deviceId} disconnected.`);
        }
    });

    ws.on('error', (error) => {
        console.log(`Error on WebSocket: ${error}`);
    });
});
