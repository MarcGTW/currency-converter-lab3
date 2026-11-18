import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadRates } from './lib/rates.js';
import { validateDate } from './public/core.js';

const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const assets = { '/': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'],
  '/app.js': ['app.js', 'text/javascript'], '/core.js': ['core.js', 'text/javascript'], '/cache.js': ['cache.js', 'text/javascript'] };

export function createApp({ loader = loadRates } = {}) {
  return createServer(async (req, res) => {
    const send = (status, type, body) => {
      res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
      res.end(body);
    };
    try {
      if (req.method !== 'GET') return send(405, 'text/plain', 'Method not allowed');
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/rates') {
        const date = url.searchParams.get('date');
        const error = validateDate(date);
        if (error) return send(400, 'application/json', JSON.stringify({ error }));
        try { return send(200, 'application/json', JSON.stringify(await loader(date))); }
        catch (error) { return send(502, 'application/json', JSON.stringify({ error: error.message })); }
      }
      const asset = assets[url.pathname];
      if (!asset) return send(404, 'text/plain', 'Not found');
      send(200, asset[1], await readFile(resolve(publicRoot, asset[0])));
    } catch {
      send(500, 'application/json', JSON.stringify({ error: 'Ошибка локального сервера. Попробуйте ещё раз.' }));
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const server = createApp();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Порт ${port} занят. Укажите другой порт в переменной PORT.` : error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`Конвертер валют: http://127.0.0.1:${port}`));
}
