const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('[Signaling Server] Client connected.');

    ws.on('message', (message) => {
        console.log('[Signaling Server] Message received:', message);
        
        // Handle different messages from the client
        if (message === 'START_AUDIO') {
            ws.send('START_AUDIO'); // Tell the client to start streaming audio
        } else if (Buffer.isBuffer(message)) {
            // Handle received audio data (raw bytes)
            console.log('Received audio data:', message.length);
            // You can process the audio here (e.g., play, save, or forward to another client)
        }
    });

    ws.on('close', () => {
        console.log('[Signaling Server] Client disconnected.');
    });
});
