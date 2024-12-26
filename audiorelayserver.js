const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Device connected.');

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);

        // First message is expected to be the deviceId
        if (!ws.deviceId) {
            ws.deviceId = message;
            ws.send('ACK'); // Send acknowledgment
            console.log(`Acknowledged device: ${ws.deviceId}`);
        } else if (message === 'REQUEST_AUDIO') {
            console.log(`Audio requested for device: ${ws.deviceId}`);
            ws.send('START_AUDIO'); // Request device to start audio streaming
        }
    });

    ws.on('close', () => {
        console.log(`Device ${ws.deviceId} disconnected.`);
    });
});
