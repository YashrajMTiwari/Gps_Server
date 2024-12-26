const WebSocket = require('ws');
const fs = require('fs');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Device connected.');

    ws.on('message', (message) => {
        try {
            if (!ws.deviceId) {
                // First message should be the deviceId
                ws.deviceId = message;
                ws.send('ACK'); // Acknowledge deviceId
                console.log(`Acknowledged device: ${ws.deviceId}`);
            } else if (message.startsWith('REQUEST_AUDIO:')) {
                // If the client requests audio, send a "START_AUDIO" message
                const deviceIdRequested = message.split(':')[1]; // Extract device ID from message
                if (deviceIdRequested === ws.deviceId) {
                    console.log(`Audio requested for device: ${ws.deviceId}`);
                    ws.send('START_AUDIO'); // Ask client to start streaming audio
                }
            } else {
                // Handle the audio data sent by the client
                const data = JSON.parse(message);
                if (data.type === 'audio') {
                    const audioBuffer = Buffer.from(data.data, 'base64');
                    fs.appendFileSync('audio.raw', audioBuffer); // Save to file
                    console.log('Audio data received and saved.');
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
