const http = require('http');

const server = http.createServer((req, res) => {
    console.log('Received request:', req.url);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World!\n');
});

const PORT = 3000;
server.listen(PORT, 'localhost', () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
}); 