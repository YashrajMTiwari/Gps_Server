const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Store WebSocket clients associated with deviceId
const clients = {};

wss.on('connection', (ws) => {
    console.log('[Server] Client connected.');

    // When a client sends a message, handle it
    ws.on('message', (message) => {
        console.log('[Server] Message received:', message);

        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
        } catch (error) {
            console.error('[Server] Error parsing message:', error);
            return;
        }

        // Handle device registration (deviceId)
        if (parsedMessage.deviceId) {
            // Register this client with its deviceId
            console.log('[Server] Device registered:', parsedMessage.deviceId);
            clients[parsedMessage.deviceId] = ws;
            ws.send(JSON.stringify({ event: 'ACK', message: 'Device registered successfully' }));
        }

        // Handle audio data (sent from the device)
        if (parsedMessage.audioData && parsedMessage.deviceId) {
            console.log('[Server] Received audio data from device:', parsedMessage.deviceId);

            // Check if the server has a client for this deviceId
            const targetClient = clients[parsedMessage.deviceId];

            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                // Forward audio to the client with the matching deviceId
                targetClient.send(parsedMessage.audioData);
                console.log('[Server] Audio data sent to client with deviceId:', parsedMessage.deviceId);
            } else {
                console.log('[Server] No client found for deviceId:', parsedMessage.deviceId);
            }
        }
    });

    // When a client disconnects
    ws.on('close', () => {
        console.log('[Server] Client disconnected.');
        // Remove client from the clients map when it disconnects
        for (const deviceId in clients) {
            if (clients[deviceId] === ws) {
                delete clients[deviceId];
                break;
            }
        }
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('[Server] WebSocket error:', error);
    });
});

console.log('WebSocket server running on ws://localhost:8080');
