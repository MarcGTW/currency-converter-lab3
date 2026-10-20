import { CURRENCIES, MIN_DATE, localToday, parseAmount, validateDate, validateSnapshot, convert, formatMoney } from './core.js';
import { readCache, writeCache, eligibleCache } from './cache.js';

const $ = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let cached = readCache(storage);
let snapshot = null;
let mode = 'network';
let busy = false;
let requestId = 0;
let controller;
let loadError = '';

for (const id of ['from', 'to']) {
  for (const [code, name] of Object.entries(CURRENCIES)) {
    const option = document.createElement('option');
    option.value = code; option.textContent = `${code} — ${name}`;
    $(id).append(option);
  }
}
$('from').value = 'EUR'; $('to').value = 'USD';
$('date').min = MIN_DATE; $('date').max = localToday(); $('date').value = localToday();
$('storage-warning').textContent = cached.warning;

function notice(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `notice ${kind}`;
}

function clearResult() {
  $('result').replaceChildren();
  const caption = document.createElement('p'); caption.className = 'result-caption'; caption.textContent = 'Из одной валюты — в другую';
  const value = document.createElement('p'); value.className = 'result-value empty'; value.textContent = 'Всё начинается с суммы.';
  const hint = document.createElement('p'); hint.className = 'rate-line'; hint.textContent = 'Выберите валюты и нажмите «Конвертировать».';
  $('result').append(caption, value, hint);
}

function updateControls() {
  let amountError = '';
  try { parseAmount($('amount').value); } catch (error) { amountError = error.message; }
  const dateError = validateDate($('date').value);
  $('amount-error').textContent = amountError;
  $('amount').setAttribute('aria-invalid', String(Boolean(amountError)));
  $('date-error').textContent = dateError;
  $('date').setAttribute('aria-invalid', String(Boolean(dateError)));
  $('amount-code').textContent = $('from').value;
  const supported = snapshot && snapshot.rates[$('from').value] && snapshot.rates[$('to').value];
  $('convert').disabled = Boolean(amountError || dateError || busy || !supported);
  $('refresh').disabled = Boolean(dateError || busy);
  $('refresh').textContent = busy ? 'Загрузка…' : '↻ Обновить курсы';
  $('use-cache').hidden = busy || !loadError || dateError || !eligibleCache(cached.snapshot, $('date').value);
  if (snapshot && !supported && !dateError) notice('Для выбранной валюты нет курса на эту дату. Выберите другую валюту или дату.', 'warning');
}

function showMetadata() {
  $('rate-date').textContent = snapshot ? displayDate(snapshot.date) : '—';
  $('mode').textContent = !snapshot ? 'Ожидание данных' : mode === 'cache' ? 'Сохранённый курс' : 'Ответ источника';
}

function displayDate(value) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function showReady() {
  if (mode === 'cache') {
    notice(`Используется сохранённый курс от ${displayDate(snapshot.date)}. Актуальность не подтверждена сетью.`, 'warning');
  } else if (snapshot.date < $('date').value) {
    notice(`На ${displayDate($('date').value)} курс не опубликован. Используется последний доступный: ${displayDate(snapshot.date)}.`, 'warning');
  } else notice('Курсы загружены. Можно выполнить конвертацию.');
}

async function refresh() {
  const id = ++requestId;
  controller?.abort();
  snapshot = null; busy = false; loadError = ''; clearResult(); showMetadata();
  const date = $('date').value;
  if (validateDate(date)) { notice('Исправьте дату, чтобы загрузить курсы.', 'error'); updateControls(); return; }
  controller = new AbortController();
  busy = true; notice('Загружаем курсы из Frankfurter…'); updateControls();
  try {
    const response = await fetch(`/api/rates?date=${encodeURIComponent(date)}`, { signal: controller.signal });
    const data = await response.json();
    if (id !== requestId) return;
    if (!response.ok) throw new Error(data.error || 'Не удалось загрузить курсы.');
    snapshot = validateSnapshot(data);
    if (snapshot.date > date) { snapshot = null; throw new Error('Источник вернул курс позже выбранной даты.'); }
    mode = 'network';
    $('storage-warning').textContent = writeCache(storage, snapshot);
    // Keep the successful answer in memory even when localStorage is unavailable.
    cached = { snapshot, savedAt: new Date().toISOString() };
    showReady(); showMetadata();
  } catch (error) {
    if (id !== requestId) return;
    snapshot = null;
    loadError = error instanceof TypeError ? 'Нет связи с локальным сервером. Проверьте, что npm start запущен.' : error.message;
    notice(`${loadError} ${eligibleCache(cached.snapshot, date) ? `Доступен сохранённый курс от ${displayDate(cached.snapshot.date)}.` : 'Подходящих сохранённых курсов нет.'}`, 'error');
    showMetadata();
  } finally {
    if (id === requestId) { busy = false; updateControls(); }
  }
}

$('converter').addEventListener('submit', event => {
  event.preventDefault(); updateControls();
  if ($('convert').disabled) return;
  try {
    const amount = parseAmount($('amount').value);
    const from = $('from').value, to = $('to').value;
    const value = convert(amount, from, to, snapshot);
    const caption = document.createElement('p'); caption.className = 'result-caption'; caption.textContent = `${formatMoney(amount, from)} ${from} =`;
    const result = document.createElement('p'); result.className = 'result-value'; result.textContent = formatMoney(value, to);
    const currency = document.createElement('p'); currency.className = 'result-currency'; currency.textContent = `${to} · ${CURRENCIES[to]}`;
    const rate = document.createElement('p'); rate.className = 'rate-line'; rate.textContent = `1 ${from} = ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 }).format(convert(1, from, to, snapshot))} ${to}`;
    $('result').replaceChildren(caption, result, currency, rate);
  } catch (error) { notice(error.message, 'error'); }
});

for (const id of ['amount', 'from', 'to']) $(id).addEventListener(id === 'amount' ? 'input' : 'change', () => {
  clearResult(); if (snapshot) showReady(); updateControls();
});
$('swap').addEventListener('click', () => {
  const old = $('from').value; $('from').value = $('to').value; $('to').value = old;
  clearResult(); if (snapshot) showReady(); updateControls();
});
$('date').addEventListener('change', refresh);
$('refresh').addEventListener('click', refresh);
$('use-cache').addEventListener('click', () => {
  if (!eligibleCache(cached.snapshot, $('date').value) || validateDate($('date').value)) return;
  snapshot = cached.snapshot; mode = 'cache'; loadError = ''; clearResult(); showReady(); showMetadata(); updateControls();
});
updateControls();
refresh();
