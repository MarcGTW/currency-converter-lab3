import test from 'node:test';
import assert from 'node:assert/strict';
import { CACHE_KEY, readCache, writeCache, eligibleCache } from '../public/cache.js';

const snapshot = { base: 'EUR', date: '2026-10-16', source: 'Frankfurter · ECB', rates: { EUR: 1, USD: 1.25 } };
function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('успешный ответ восстанавливается через новый вызов чтения', () => {
  const storage = memoryStorage();
  assert.equal(readCache(storage).snapshot, null);
  assert.equal(writeCache(storage, snapshot), '');
  const restored = readCache(storage);
  assert.deepEqual(restored.snapshot, snapshot);
  assert.ok(restored.savedAt);
});

test('повреждённый, устаревший формат и недоступный storage не роняют приложение', () => {
  const storage = memoryStorage();
  for (const data of ['broken', '{}', JSON.stringify({ version: 2, snapshot }),
    JSON.stringify({ version: 1, snapshot, savedAt: 'wrong' }),
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), snapshot: { ...snapshot, rates: {} } })]) {
    storage.setItem(CACHE_KEY, data);
    assert.equal(readCache(storage).snapshot, null);
    assert.ok(readCache(storage).warning);
  }
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  assert.ok(readCache(blocked).warning);
  assert.ok(writeCache(blocked, snapshot));
  assert.ok(readCache(null).warning);
});

test('невалидный новый ответ не затирает последний успешный кэш', () => {
  const storage = memoryStorage();
  writeCache(storage, snapshot);
  assert.ok(writeCache(storage, {}));
  assert.deepEqual(readCache(storage).snapshot, snapshot);
});

test('для исторического запроса кэш из будущего не предлагается', () => {
  assert.equal(eligibleCache(snapshot, '2026-10-18'), true);
  assert.equal(eligibleCache(snapshot, '2026-10-16'), true);
  assert.equal(eligibleCache(snapshot, '2026-10-15'), false);
  assert.equal(eligibleCache(null, '2026-10-18'), false);
  assert.equal(eligibleCache(snapshot, 'invalid'), false);
});
