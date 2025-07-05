// Simple WebSocket test for Deno - Testing ping/pong
const ws = new WebSocket('ws://localhost:8000/ws');

let messageCount = 0;
const maxMessages = 3;

ws.onopen = function(_event) {
    console.log('✅ WebSocket connection opened');
    
    // Send a ping message (expected by the WebSocketManager)
    const pingMessage = { type: 'ping', timestamp: Date.now() };
    ws.send(JSON.stringify(pingMessage));
    console.log('📤 Sent:', pingMessage);
};

ws.onmessage = function(event) {
    console.log('📥 Received:', event.data);
    
    try {
        const message = JSON.parse(event.data);
        if (message.type === 'pong') {
            console.log('✅ Received pong response - WebSocket server is working correctly');
        }
    } catch (_e) {
        console.log('📥 Received non-JSON message:', event.data);
    }
    
    messageCount++;
    
    if (messageCount >= maxMessages) {
        console.log('✅ Test completed successfully');
        ws.close();
        setTimeout(() => Deno.exit(0), 100);
    }
};

ws.onerror = function(error) {
    console.error('❌ WebSocket error:', error);
    Deno.exit(1);
};

ws.onclose = function(event) {
    console.log('🔐 WebSocket connection closed:', event.code, event.reason);
    if (messageCount === 0) {
        console.error('❌ No messages received');
        Deno.exit(1);
    }
};

// Auto-close after 5 seconds
setTimeout(() => {
    console.log('⏰ Test timeout reached');
    ws.close();
    Deno.exit(0);
}, 5000);
