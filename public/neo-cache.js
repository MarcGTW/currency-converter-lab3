import { validateNeoSnapshot } from './neo-core.js';

export const CACHE_STORAGE_KEY = 'neo_tracker_snapshot_v1';

/**
 * Сохраняет снимок астероидов в локальное хранилище браузера (localStorage).
 */
export function saveNeoCache(snapshot, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    const validated = validateNeoSnapshot(snapshot);
    const payload = JSON.stringify({
      ...validated,
      cached_at: new Date().toISOString()
    });
    storage.setItem(CACHE_STORAGE_KEY, payload);
    return true;
  } catch (err) {
    console.warn('Не удалось сохранить кэш астероидов:', err.message);
    return false;
  }
}

/**
 * Извлекает последний сохраненный снимок астероидов из localStorage.
 */
export function loadNeoCache(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return validateNeoSnapshot(data);
  } catch (err) {
    console.warn('Не удалось прочитать кэш астероидов или формат поврежден:', err.message);
    return null;
  }
}

/**
 * Очищает сохраненный кэш астероидов.
 */
export function clearNeoCache(storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.removeItem(CACHE_STORAGE_KEY);
  } catch {}
}
