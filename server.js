const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const PORT = 3000;
const MONGO_URI = "mongodb://mabakers:MABakers2026@ac-bef9z32-shard-00-00.g6icoaj.mongodb.net:27017,ac-bef9z32-shard-00-01.g6icoaj.mongodb.net:27017,ac-bef9z32-shard-00-02.g6icoaj.mongodb.net:27017/?ssl=true&replicaSet=atlas-bcn35h-shard-0&authSource=admin&appName=Cluster0";
const LOCAL_FILE = 'C:\\MABakers\\data.json';

let db;
let collection;

async function connectDB() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db('mabakers');
        collection = db.collection('appdata');
        console.log('Connected to MongoDB!');
    } catch (e) {
        console.log('MongoDB connection failed:', e.message);
    }
}

async function loadData() {
    try {
        if (collection) {
            const doc = await collection.findOne({ _id: 'data' });
            if (doc) {
                delete doc._id;
                return doc;
            }
        }
    } catch (e) {}
    if (fs.existsSync(LOCAL_FILE)) {
        return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
    }
    return { customers: {}, daily: {} };
}

async function saveData(data) {
    try {
        if (collection) {
            await collection.replaceOne(
                { _id: 'data' },
                { _id: 'data', ...data },
                { upsert: true }
            );
        }
    } catch (e) {
        console.log('Save error:', e.message);
    }
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/api/data') {
        const data = await loadData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    }

    if (req.method === 'POST' && (req.url === '/api/data' || req.url === '/api/sync')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const phoneData = JSON.parse(body);
                if (req.url === '/api/sync') {
                    const laptopData = await loadData();
                    const mergedCustomers = { ...laptopData.customers, ...phoneData.customers };
                    const mergedDaily = { ...laptopData.daily };
                    for (const date in phoneData.daily) {
                        if (!mergedDaily[date]) mergedDaily[date] = {};
                        mergedDaily[date] = { ...mergedDaily[date], ...phoneData.daily[date] };
                    }
                    const merged = { customers: mergedCustomers, daily: mergedDaily };
                    await saveData(merged);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(merged));
                } else {
                    await saveData(phoneData);
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

    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.png' ? 'image/png' : 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(filePath));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log("MA Bakers server running on port " + PORT);
    });
});
