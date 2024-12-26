const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('WebSocket server is listening on ws://localhost:8080');

const devices = {};
const clients = {};

wss.on('connection', (ws) => {
    let deviceId = null;

    ws.on('message', (message) => {
        if (typeof message === 'string') {
            if (!deviceId) {
                deviceId = message; // First message is the deviceId
                devices[deviceId] = devices[deviceId] || [];
                devices[deviceId].push({ ws }); // Register device connection
                console.log(`Device ${deviceId} connected.`);
                ws.send(`Welcome device ${deviceId}`);
            } else if (message.startsWith('REQUEST_AUDIO:')) {
                const targetDeviceId = message.split(':')[1];
                if (devices[targetDeviceId]) {
                    devices[targetDeviceId].forEach(deviceClient => {
                        if (deviceClient.ws.readyState === WebSocket.OPEN) {
                            deviceClient.ws.send('START_AUDIO');
                        }
                    });
                }
            }
        }
    });

    ws.on('close', () => {
        if (deviceId) {
            devices[deviceId] = devices[deviceId].filter(client => client.ws !== ws);
            if (devices[deviceId].length === 0) {
                delete devices[deviceId];
            }
            console.log(`Device ${deviceId} disconnected.`);
        }
    });
});

