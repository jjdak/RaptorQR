#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./web/', import.meta.url)));
const args = process.argv.slice(2);
const requestedPort = numberArg('--port', 4173);
const host = stringArg('--host', '127.0.0.1');
const noBrowser = args.includes('--no-browser');

if (!existsSync(join(root, 'index.html'))) {
  throw new Error(`Offline web files are missing: ${root}`);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = createServer((request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendText(response, 405, 'Method not allowed');
      return;
    }

    const requestUrl = new URL(request.url ?? '/', 'http://localhost');
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    let filePath = resolve(root, normalize(relativePath));
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      sendText(response, 403, 'Forbidden');
      return;
    }

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    if (!existsSync(filePath) && !extname(relativePath)) {
      filePath = join(root, 'index.html');
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }

    const content = readFileSync(filePath);
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': content.byteLength,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    sendText(response, 500, error instanceof Error ? error.message : String(error));
  }
});

listen(requestedPort);

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < requestedPort + 19) {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, host, () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    const url = `http://localhost:${activePort}/`;
    console.log(`RaptorQR is available on this computer at ${url}`);
    console.log('Press Ctrl-C to stop.');
    if (!noBrowser) openBrowser(url);
  });
}

function sendText(response, status, message) {
  const content = Buffer.from(message);
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': content.byteLength,
  });
  response.end(content);
}

function stringArg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function numberArg(name, fallback) {
  const parsed = Number(stringArg(name, String(fallback)));
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

function openBrowser(url) {
  const command = process.platform === 'darwin'
    ? ['open', [url]]
    : process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : ['xdg-open', [url]];
  const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}
