const http = require('http');

const server = http.createServer((req, res) => {
    console.log('Request received:', req.url);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Hello World</h1>');
});

const PORT = 8080;
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:${PORT}`);
    console.log('Press Ctrl+C to stop');
}); 