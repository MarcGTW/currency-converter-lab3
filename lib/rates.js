import { CURRENCIES, MIN_DATE, parseRates, validateDate } from '../public/core.js';

export function previousDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function loadRates(requestedDate, { fetcher = fetch, today, timeout = 6000 } = {}) {
  const error = validateDate(requestedDate, today);
  if (error) throw new Error(error);
  let date = requestedDate;
  const deadline = Date.now() + 15000;
  for (let attempt = 0; attempt <= 10 && date >= MIN_DATE; attempt++, date = previousDate(date)) {
    const url = new URL('https://api.frankfurter.dev/v2/rates');
    url.search = new URLSearchParams({ base: 'EUR', quotes: Object.keys(CURRENCIES).filter(c => c !== 'EUR').join(','),
      providers: 'ecb', date }).toString();
    let response;
    try {
      response = await fetcher(url, { signal: AbortSignal.timeout(Math.max(1, Math.min(timeout, deadline - Date.now()))) });
    } catch {
      throw new Error('Не удалось связаться с источником курсов. Проверьте подключение к интернету.');
    }
    if (!response.ok) throw new Error(`Источник курсов временно недоступен (HTTP ${response.status}).`);
    let body;
    try { body = await response.json(); }
    catch { throw new Error('Источник вернул повреждённый JSON.'); }
    const snapshot = parseRates(body, date);
    if (snapshot) return snapshot;
    if (Date.now() >= deadline) break;
  }
  throw new Error('За выбранную дату и предыдущие 10 дней курсы не опубликованы.');
}
