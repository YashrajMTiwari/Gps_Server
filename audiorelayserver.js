const WebSocket = require('ws');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 8080 });

// Maintain a map of deviceId to WebSocket connections
const devices = new Map();

wss.on('connection', (ws) => {
    console.log('Device connected.');

    ws.on('message', (message) => {
        try {
            console.log(`Raw message received: ${message}`);

            if (!ws.deviceId) {
                // First message should be the deviceId
                ws.deviceId = message; // Set deviceId for this connection
                devices.set(ws.deviceId, ws); // Track the WebSocket by deviceId
                ws.send('ACK'); // Acknowledge deviceId
                console.log(`Acknowledged device: ${ws.deviceId}`);
            } else if (message.startsWith('REQUEST_AUDIO:')) {
                // If the client requests audio, send a "START_AUDIO" message
                const deviceIdRequested = message.split(':')[1].trim(); // Extract device ID from message
                const targetWs = devices.get(deviceIdRequested);
                if (targetWs) {
                    console.log(`Audio requested for device: ${deviceIdRequested}`);
                    targetWs.send('START_AUDIO'); // Ask client to start streaming audio
                } else {
                    console.log(`Device ${deviceIdRequested} not found.`);
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
        if (ws.deviceId) {
            devices.delete(ws.deviceId); // Remove device from the map
            console.log(`Device ${ws.deviceId} disconnected.`);
        }
    });
});
