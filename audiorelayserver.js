const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('[Signaling Server] Client connected.');

    ws.on('message', (message) => {
        console.log('[Signaling Server] Message received:', message);
        // Broadcast SDP/ICE to the other peer
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('[Signaling Server] Client disconnected.');
    });
});
