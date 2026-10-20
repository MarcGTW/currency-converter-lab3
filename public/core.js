export const CURRENCIES = Object.freeze({
  EUR: 'Евро', USD: 'Доллар США', GBP: 'Фунт стерлингов',
  CHF: 'Швейцарский франк', JPY: 'Японская иена', CAD: 'Канадский доллар',
  AUD: 'Австралийский доллар', CNY: 'Китайский юань', PLN: 'Польский злотый', SEK: 'Шведская крона',
});
export const SOURCE = 'Frankfurter · ECB';
export const MIN_DATE = '1999-01-04';

export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateDate(value, today = localToday()) {
  if (!isDate(value)) return 'Выберите существующую дату.';
  if (value < MIN_DATE) return 'Доступны даты с 4 января 1999 года.';
  if (value > today) return 'Дата не может быть в будущем.';
  return '';
}

export function parseAmount(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('Введите сумму больше нуля.');
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) {
    throw new Error('Введите положительное число, не более 2 знаков после точки или запятой.');
  }
  const amount = Number(text.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
    throw new Error('Сумма должна быть больше 0 и не превышать 1 000 000 000 000.');
  }
  return amount;
}

// A snapshot always contains one base and one publication date.
export function parseRates(payload, requestedDate) {
  if (!isDate(requestedDate)) throw new Error('Некорректная дата запроса.');
  if (!Array.isArray(payload)) throw new Error('Источник вернул некорректный ответ.');
  if (payload.length === 0) return null;
  const rates = { EUR: 1 };
  let date;
  for (const row of payload) {
    if (!row || row.base !== 'EUR' || !Object.hasOwn(CURRENCIES, row.quote) || row.quote === 'EUR'
      || !isDate(row.date) || row.date < MIN_DATE || row.date > requestedDate
      || typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0
      || Object.hasOwn(rates, row.quote) || (date && date !== row.date)) {
      throw new Error('Источник вернул некорректные или несогласованные курсы.');
    }
    date = row.date;
    rates[row.quote] = row.rate;
  }
  return { date, base: 'EUR', rates, source: SOURCE };
}

export function validateSnapshot(snapshot) {
  if (!snapshot || snapshot.base !== 'EUR' || snapshot.source !== SOURCE
    || !isDate(snapshot.date) || snapshot.date < MIN_DATE || snapshot.date > localToday()
    || !snapshot.rates || snapshot.rates.EUR !== 1) throw new Error('Неверный формат сохранённых курсов.');
  const rows = Object.entries(snapshot.rates).filter(([key]) => key !== 'EUR')
    .map(([quote, rate]) => ({ base: 'EUR', quote, rate, date: snapshot.date }));
  const parsed = parseRates(rows, snapshot.date);
  if (!parsed) throw new Error('Сохранённые курсы пусты.');
  return parsed;
}

export function convert(amount, from, to, snapshot) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) throw new Error('Некорректная сумма.');
  if (!Object.hasOwn(CURRENCIES, from) || !Object.hasOwn(CURRENCIES, to)) throw new Error('Выберите валюты.');
  const a = snapshot?.rates?.[from];
  const b = snapshot?.rates?.[to];
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    throw new Error('Для выбранной валюты нет курса на эту дату. Выберите другую дату или валюту.');
  }
  const result = amount / a * b;
  if (!Number.isFinite(result)) throw new Error('Результат выходит за допустимый диапазон.');
  return result;
}

export function formatMoney(value, currency) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(value);
}
