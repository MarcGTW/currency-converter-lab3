import { validateSnapshot, isDate } from './core.js';
export const CACHE_KEY = 'currency-lab:rates:v1';

export function readCache(storage) {
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return { snapshot: null, warning: '' };
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || !isDate(saved.savedAt?.slice(0, 10))
      || !Number.isFinite(Date.parse(saved.savedAt))) throw new Error('Invalid cache');
    return { snapshot: validateSnapshot(saved.snapshot), warning: '', savedAt: saved.savedAt };
  } catch {
    return { snapshot: null, warning: 'Сохранённые данные повреждены или хранилище недоступно. Загрузите курсы из сети.' };
  }
}

export function writeCache(storage, snapshot) {
  try {
    const valid = validateSnapshot(snapshot);
    storage.setItem(CACHE_KEY, JSON.stringify({ version: 1, snapshot: valid, savedAt: new Date().toISOString() }));
    return '';
  } catch {
    return 'Курсы загружены, но сохранить их не удалось. После перезапуска кэш может быть недоступен.';
  }
}

export function eligibleCache(snapshot, requestedDate) {
  return Boolean(snapshot && isDate(requestedDate) && snapshot.date <= requestedDate);
}
