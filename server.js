const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (data.command) {
        console.log('Running command with spawn:', data.command);

        const cmd = spawn('/bin/bash', ['-c', data.command]);

        cmd.stdout.on('data', (chunk) => {
          ws.send(chunk.toString());
        });

        cmd.stderr.on('data', (chunk) => {
          ws.send('[stderr] ' + chunk.toString());
        });

        cmd.on('close', (code) => {
          ws.send(`[process exited with code ${code}]`);
        });
      }
    } catch (err) {
      ws.send(`Invalid message: ${err.message}`);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(4000, () => {
  console.log('Server running on port 4000');
});
