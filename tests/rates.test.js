import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRates, previousDate } from '../lib/rates.js';

const row = { base: 'EUR', quote: 'USD', date: '2026-10-16', rate: 1.25 };
const options = { today: '2026-10-21' };
const response = body => ({ ok: true, json: async () => body });

test('выходной: используется дата ответа, запрос ограничен официальным endpoint', async () => {
  const result = await loadRates('2026-10-18', { ...options, fetcher: async (url, init) => {
    assert.equal(url.hostname, 'api.frankfurter.dev');
    assert.equal(url.searchParams.get('providers'), 'ecb');
    assert.equal(url.searchParams.get('date'), '2026-10-18');
    assert.ok(init.signal);
    return response([row]);
  } });
  assert.equal(result.date, '2026-10-16');
});

test('пустой день: поиск назад до первого успешного ответа', async () => {
  const dates = [];
  const result = await loadRates('2026-10-18', { ...options, fetcher: async url => {
    dates.push(url.searchParams.get('date'));
    return response(dates.length === 3 ? [row] : []);
  } });
  assert.deepEqual(dates, ['2026-10-18', '2026-10-17', '2026-10-16']);
  assert.equal(result.date, '2026-10-16');
});

test('поиск ограничен десятью предыдущими днями', async () => {
  let count = 0;
  await assert.rejects(loadRates('2026-10-18', { ...options, fetcher: async () => { count++; return response([]); } }), /10 дней/);
  assert.equal(count, 11);
});

test('сеть и таймаут не вызывают повторный обход дат', async () => {
  for (const cause of [new TypeError('offline'), new DOMException('timeout', 'TimeoutError')]) {
    let count = 0;
    await assert.rejects(loadRates('2026-10-18', { ...options, fetcher: async () => { count++; throw cause; } }), /подключение/);
    assert.equal(count, 1);
  }
});

test('HTTP, повреждённый JSON и неверная схема отличаются от пустого дня', async () => {
  await assert.rejects(loadRates('2026-10-18', { ...options, fetcher: async () => ({ ok: false, status: 429 }) }), /429/);
  await assert.rejects(loadRates('2026-10-18', { ...options, fetcher: async () => ({ ok: true, json() { throw new Error('bad'); } }) }), /JSON/);
  await assert.rejects(loadRates('2026-10-18', { ...options, fetcher: async () => response({ error: 'bad' }) }), /некорректный ответ/);
  await assert.rejects(loadRates('2026-10-18', { ...options, fetcher: async () => response([{ ...row, date: '2026-10-19' }]) }), /несогласованные/);
});

test('неверная дата не приводит к сетевому запросу', async () => {
  await assert.rejects(loadRates('2026-02-31', { ...options, fetcher() { assert.fail('Unexpected request'); } }), /дату/);
});

test('предыдущий день на границах месяца, года и високосного февраля', () => {
  assert.equal(previousDate('2026-01-01'), '2025-12-31');
  assert.equal(previousDate('2024-03-01'), '2024-02-29');
  assert.equal(previousDate('2026-03-01'), '2026-02-28');
});
