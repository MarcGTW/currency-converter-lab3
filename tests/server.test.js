import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server.js';

async function withServer(loader, fn) {
  const app = createApp({ loader });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  try { await fn(`http://127.0.0.1:${app.address().port}`); }
  finally { await new Promise(resolve => app.close(resolve)); }
}

test('сервер отдаёт GUI и модули, закрывает посторонние пути и методы', async () => {
  await withServer(async () => ({}), async url => {
    const html = await fetch(url);
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-type'), /text\/html/);
    assert.match(await html.text(), /Конвертация/);
    for (const path of ['/app.js', '/core.js', '/cache.js', '/styles.css']) assert.equal((await fetch(url + path)).status, 200);
    assert.equal((await fetch(url + '/package.json')).status, 404);
    assert.equal((await fetch(url + '/', { method: 'POST' })).status, 405);
  });
});

test('API валидирует дату, передаёт результат и выдаёт понятный сбой', async () => {
  await withServer(async date => ({ date, rates: { EUR: 1, USD: 1.25 } }), async url => {
    assert.equal((await fetch(url + '/api/rates?date=wrong')).status, 400);
    const response = await fetch(url + '/api/rates?date=2026-10-16');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).rates.USD, 1.25);
  });
  await withServer(async () => { throw new Error('Нет сети'); }, async url => {
    const response = await fetch(url + '/api/rates?date=2026-10-16');
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, 'Нет сети');
  });
});
