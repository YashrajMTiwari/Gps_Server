const WebSocket = require('ws');
const fs = require('fs');
const wss = new WebSocket.Server({ port: 8080 });

ws.on('message', (message) => {
    try {
        console.log(`Raw message received: ${message}`);
        if (!ws.deviceId) {
            ws.deviceId = message; // Initial message is deviceId
            ws.send('ACK');
            console.log(`Acknowledged device: ${ws.deviceId}`);
        } else if (message.startsWith('REQUEST_AUDIO:')) {
            const deviceIdRequested = message.split(':')[1];
            if (deviceIdRequested === ws.deviceId) {
                console.log(`Audio requested for device: ${ws.deviceId}`);
                ws.send('START_AUDIO');
            }
        } else {
            console.log(`Audio data received: ${message}`);
            const data = JSON.parse(message);
            if (data.type === 'audio') {
                const audioBuffer = Buffer.from(data.data, 'base64');
                fs.appendFileSync('audio.raw', audioBuffer);
                console.log(`Audio data saved: ${audioBuffer.length} bytes`);
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
});


