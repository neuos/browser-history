// Quick WebSocket test to verify everything works
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = function() {
    console.log('✅ WebSocket connected');
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('📥 Received:', message);
    if (message.type === 'pong') {
        console.log('✅ Environment config WebSocket test successful!');
        ws.close();
        setTimeout(() => Deno.exit(0), 100);
    }
};

ws.onerror = function(error) {
    console.error('❌ WebSocket error:', error);
    Deno.exit(1);
};

setTimeout(() => {
    console.log('⏰ Test timeout');
    Deno.exit(0);
}, 3000);
