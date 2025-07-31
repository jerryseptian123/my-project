const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    });

    res.write('Awake...\n');

    const interval = setInterval(() => {
      res.write(`ping ${new Date().toISOString()}\n`);
    }, 5000); // kirim tiap 5 detik

    // Akhiri setelah 5 menit
    setTimeout(() => {
      clearInterval(interval);
      res.write('Done.\n');
      res.end();
    }, 300000); // 5 menit
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  let currentProcess = null;

  const safeSend = (msg) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  };

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'ping') {
        safeSend(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (data.command) {
        console.log('Running command:', data.command);

        // Kill previous process
        if (currentProcess) {
          currentProcess.kill();
        }

        currentProcess = spawn('/bin/bash', ['-c', data.command]);

        currentProcess.stdout.on('data', (chunk) => {
          safeSend(chunk.toString());
        });

        currentProcess.stderr.on('data', (chunk) => {
          safeSend('[stderr] ' + chunk.toString());
        });

        currentProcess.on('close', (code) => {
          safeSend(`[process exited with code ${code}]`);
          currentProcess = null;
        });
      }
    } catch (err) {
      safeSend(`Invalid message: ${err.message}`);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentProcess) {
      currentProcess.kill();
    }
  });
});

server.listen(4000, () => {
  console.log('Server running on port 4000');
});
