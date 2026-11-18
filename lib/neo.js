import { NASA_SOURCE, parseNeoResponse, validateNeoDate } from '../public/neo-core.js';

/**
 * Загрузчик данных об околоземных астероидах из официального NASA NeoWs Feed API.
 */
export async function loadNeoData(requestedDate, { fetcher = fetch, timeout = 9000, apiKey = 'DEMO_KEY' } = {}) {
  const error = validateNeoDate(requestedDate);
  if (error) {
    throw new Error(error);
  }

  const url = new URL('https://api.nasa.gov/neo/rest/v1/feed');
  url.searchParams.set('start_date', requestedDate);
  url.searchParams.set('end_date', requestedDate);
  url.searchParams.set('api_key', apiKey);

  let response;
  try {
    response = await fetcher(url, {
      signal: AbortSignal.timeout(timeout)
    });
  } catch (err) {
    throw new Error('Не удалось связаться с сервером NASA API. Проверьте интернет-соединение.');
  }

  if (response.status === 429) {
    throw new Error('Превышен лимит запросов к бесплатному NASA API (HTTP 429 Rate Limit). Попробуйте позже или используйте кэш.');
  }

  if (!response.ok) {
    throw new Error(`Сервер NASA API вернул ошибку (HTTP ${response.status}).`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Сервер NASA API вернул поврежденный ответ (не JSON).');
  }

  return parseNeoResponse(body, requestedDate);
}
