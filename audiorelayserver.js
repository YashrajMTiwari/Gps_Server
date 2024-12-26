const WebSocket = require('ws');
const fs = require('fs');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Device connected.');

    ws.on('message', (message) => {
        try {
            if (!ws.deviceId) {
                ws.deviceId = message; // First message is deviceId
                ws.send('ACK');
                console.log(`Acknowledged device: ${ws.deviceId}`);
            } else if (message.startsWith('REQUEST_AUDIO:')) {
                const deviceIdRequested = message.split(':')[1];
                if (deviceIdRequested === ws.deviceId) {
                    console.log(`Audio requested for device: ${ws.deviceId}`);
                    ws.send('START_AUDIO');
                }
            } else {
                const data = JSON.parse(message);
                if (data.type === 'audio') {
                    const audioBuffer = Buffer.from(data.data, 'base64');
                    fs.appendFileSync('audio.raw', audioBuffer); // Save audio data
                    console.log(`Received ${audioBuffer.length} bytes of audio data.`);
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Device ${ws.deviceId || 'unknown'} disconnected.`);
    });
});

