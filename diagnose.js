const http = require('http');
const os = require('os');

// Get network interfaces
const networkInterfaces = os.networkInterfaces();
console.log('Network Interfaces:', networkInterfaces);

// Create server
const server = http.createServer((req, res) => {
    console.log('Received request:', req.url);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World!\n');
});

// Try different ports
const ports = [3000, 8080, 5000];
let currentPort = 0;

function tryNextPort() {
    if (currentPort >= ports.length) {
        console.log('All ports failed. Please check your network configuration.');
        return;
    }

    const port = ports[currentPort];
    server.listen(port, 'localhost', () => {
        console.log(`Server running on http://localhost:${port}`);
        console.log('Press Ctrl+C to stop the server');
    }).on('error', (err) => {
        console.log(`Failed to start server on port ${port}:`, err.message);
        currentPort++;
        tryNextPort();
    });
}

tryNextPort(); 