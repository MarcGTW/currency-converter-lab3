import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, isDate, validateDate, parseRates, validateSnapshot, convert, formatMoney } from '../public/core.js';

const date = '2026-10-16';
const rows = [{ base: 'EUR', quote: 'USD', date, rate: 1.25 }, { base: 'EUR', quote: 'GBP', date, rate: 0.8 }];
const snapshot = parseRates(rows, date);

test('разбор реального контракта v2: база, дата, источник и числовые курсы', () => {
  assert.deepEqual(snapshot, { base: 'EUR', date, source: 'Frankfurter · ECB', rates: { EUR: 1, USD: 1.25, GBP: 0.8 } });
  assert.equal(parseRates(rows, '2026-10-18').date, date);
  assert.deepEqual(validateSnapshot(snapshot), snapshot);
});

test('пустой массив обозначает отсутствие опубликованных данных', () => {
  assert.equal(parseRates([], date), null);
});

test('неверные ответы отвергаются, включая смешанные даты и дубликаты', () => {
  for (const bad of [null, {}, 'oops', { error: 'unavailable' }, [null],
    [{ ...rows[0], base: 'USD' }], [{ ...rows[0], rate: '1.25' }], [{ ...rows[0], rate: 0 }],
    [{ ...rows[0], rate: -2 }], [{ ...rows[0], rate: Infinity }], [{ ...rows[0], rate: NaN }],
    [{ ...rows[0], quote: 'BAD' }], [{ ...rows[0], quote: 'EUR' }],
    [{ ...rows[0], date: '2026-02-31' }], [{ ...rows[0], date: '2026-10-19' }],
    [rows[0], rows[0]], [rows[0], { ...rows[1], date: '2026-10-15' }]]) {
    assert.throws(() => parseRates(bad, date));
  }
  assert.throws(() => parseRates(rows, 'invalid'));
});

test('прямое, обратное, перекрёстное и одинаковое направления', () => {
  assert.equal(convert(100, 'EUR', 'USD', snapshot), 125);
  assert.equal(convert(125, 'USD', 'EUR', snapshot), 100);
  assert.equal(convert(100, 'USD', 'GBP', snapshot), 64);
  assert.equal(convert(100, 'GBP', 'USD', snapshot), 156.25);
  assert.equal(convert(100.25, 'EUR', 'EUR', snapshot), 100.25);
  assert.equal(convert(12.34, 'USD', 'USD', snapshot), 12.34);
  assert.equal(convert(0.01, 'USD', 'USD', { rates: { USD: 1.1253 } }), 0.01);
  assert.equal(convert(convert(123.45, 'USD', 'GBP', snapshot), 'GBP', 'USD', snapshot), 123.45);
});

test('расчёт не принимает неверную сумму и отсутствующие валюты', () => {
  for (const value of [0, -1, Infinity, NaN, 1e13, '100']) assert.throws(() => convert(value, 'EUR', 'USD', snapshot));
  assert.throws(() => convert(10, 'JPY', 'EUR', snapshot));
  assert.throws(() => convert(10, 'EUR', 'BAD', snapshot));
  assert.throws(() => convert(10, 'EUR', 'USD', null));
});

test('валидация суммы: точка/запятая и границы', () => {
  for (const [input, expected] of [['100', 100], ['100,50', 100.5], [' 0.01 ', 0.01], ['1000000000000', 1e12]]) {
    assert.equal(parseAmount(input), expected);
  }
  for (const value of ['', ' ', '-1', '0', '0,00', 'abc', '12abc', '1e3', 'Infinity', 'NaN',
    '1.234', '1,2.3', '1 000', '+1', '12.', '1000000000000.01', null]) assert.throws(() => parseAmount(value));
});

test('календарная валидация и диапазон, включая високосный год', () => {
  assert.ok(isDate('2024-02-29'));
  for (const value of ['2026-02-29', '2026-02-31', '2026-13-01', '2026-00-01', '2026-1-01', '', null]) assert.equal(isDate(value), false);
  assert.equal(validateDate('2026-10-16', '2026-10-21'), '');
  assert.ok(validateDate('2026-10-22', '2026-10-21'));
  assert.ok(validateDate('1999-01-03', '2026-10-21'));
  assert.ok(validateDate('2026-02-31', '2026-10-21'));
});

test('округление только при форматировании, JPY без десятичных', () => {
  assert.equal(formatMoney(1.256, 'USD'), '1,26');
  assert.equal(formatMoney(125.6, 'JPY'), '126');
});

test('кэшируемый snapshot обязан иметь корректную схему', () => {
  for (const value of [null, {}, { ...snapshot, rates: { EUR: 1 } }, { ...snapshot, source: 'Unknown' },
    { ...snapshot, rates: { EUR: 2, USD: 1 } }, { ...snapshot, date: '2999-01-01' }]) assert.throws(() => validateSnapshot(value));
});
