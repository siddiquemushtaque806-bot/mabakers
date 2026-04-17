const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = 'C:\\MABakers\\data.json';

function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    return { customers: {}, daily: {} };
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/api/data') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(loadData()));
        return;
    }

    if (req.method === 'POST' && (req.url === '/api/data' || req.url === '/api/sync')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const phoneData = JSON.parse(body);
                if (req.url === '/api/sync') {
                    const laptopData = loadData();
                    const mergedCustomers = { ...laptopData.customers, ...phoneData.customers };
                    const mergedDaily = { ...laptopData.daily };
                    for (const date in phoneData.daily) {
                        if (!mergedDaily[date]) mergedDaily[date] = {};
                        mergedDaily[date] = { ...mergedDaily[date], ...phoneData.daily[date] };
                    }
                    const merged = { customers: mergedCustomers, daily: mergedDaily };
                    saveData(merged);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(merged));
                } else {
                    saveData(phoneData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                }
            } catch (e) {
                res.writeHead(400);
                res.end('Error');
            }
        });
        return;
    }

    // Serve static files
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(filePath));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log("MA Bakers server running on port " + PORT);
    console.log("Open on phone: http://192.168.10.14:" + PORT);
});