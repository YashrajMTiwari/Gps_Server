const WebSocket = require('ws');
const fs = require('fs');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Device connected.');

    ws.on('message', (message) => {
        try {
            if (!ws.deviceId) {
                ws.deviceId = message;
                ws.send('ACK'); // Acknowledge device ID
                console.log(`Acknowledged device: ${ws.deviceId}`);
            } else {
                const data = JSON.parse(message);
                if (data.type === 'audio') {
                    const audioBuffer = Buffer.from(data.data, 'base64');
                    fs.appendFileSync('audio.raw', audioBuffer); // Save to file
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Device ${ws.deviceId} disconnected.`);
    });
});
