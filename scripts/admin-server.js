#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const eventsPath = path.join(root, 'data', 'events.json');
const port = Number(process.env.PORT || 4100);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function stringifyJson(payload) {
  return JSON.stringify(payload, null, 2).replace(/[\u007f-\uffff]/g, char => {
    return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
  }) + '\n';
}

function readBody(req, callback) {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 2 * 1024 * 1024) {
      req.destroy();
    }
  });
  req.on('end', () => callback(null, body));
  req.on('error', callback);
}

function duplicateIds(events) {
  const seen = new Set();
  const duplicates = new Set();
  events.forEach(event => {
    const id = String(event && event.id ? event.id : '').trim();
    if (!id) return;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });
  return Array.from(duplicates);
}

function safeStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const cleanPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const fullPath = path.normalize(path.join(root, cleanPath));
  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) {
    return null;
  }
  return fullPath;
}

function saveEvents(req, res) {
  readBody(req, (err, body) => {
    let parsed;
    if (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return;
    }
    try {
      parsed = JSON.parse(body);
    } catch (parseErr) {
      sendJson(res, 400, { ok: false, error: 'Request body is not valid JSON.' });
      return;
    }
    if (!parsed || !Array.isArray(parsed.events)) {
      sendJson(res, 400, { ok: false, error: 'JSON must contain an events array.' });
      return;
    }
    const duplicates = duplicateIds(parsed.events);
    if (duplicates.length) {
      sendJson(res, 400, { ok: false, error: `Duplicate Timeline IDs: ${duplicates.join(', ')}.` });
      return;
    }
    try {
      fs.writeFileSync(eventsPath, stringifyJson(parsed));
      sendJson(res, 200, {
        ok: true,
        path: path.relative(root, eventsPath),
        entries: parsed.events.length
      });
    } catch (writeErr) {
      sendJson(res, 500, { ok: false, error: writeErr.message });
    }
  });
}

function serveStatic(req, res) {
  const filePath = safeStaticPath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__admin/status') {
    sendJson(res, 200, { ok: true, mode: 'local-write' });
    return;
  }
  if (req.method === 'POST' && req.url === '/__admin/save-events') {
    saveEvents(req, res);
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Totem Builder running at http://127.0.0.1:${port}/admin.html`);
  console.log('Save endpoint writes data/events.json in this repo.');
});
