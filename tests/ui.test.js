import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  parseAsteroidItem,
  formatDiameter,
  formatVelocity,
  formatDistance,
  filterAndSortAsteroids
} from '../public/neo-core.js';
import { convert, formatMoney } from '../public/core.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const htmlContent = await readFile(resolve(root, 'public/index.html'), 'utf-8');
const cssContent = await readFile(resolve(root, 'public/styles.css'), 'utf-8');

test('UI: index.html содержит все ключевые элементы управления и семантические теги', () => {
  // Проверка семантических тегов и структуры страницы
  assert.match(htmlContent, /<header class="topbar">/);
  assert.match(htmlContent, /<main class="main-content">/);
  assert.match(htmlContent, /<footer class="app-footer">/);

  // Навигация и переключатель вкладок
  assert.match(htmlContent, /id="tab-neo"/);
  assert.match(htmlContent, /id="tab-rates"/);
  assert.match(htmlContent, /role="tab"/);

  // Вью NASA NEO Tracker
  assert.match(htmlContent, /id="view-neo"/);
  assert.match(htmlContent, /id="neo-form"/);
  assert.match(htmlContent, /id="neo-date"/);
  assert.match(htmlContent, /id="neo-submit"/);
  assert.match(htmlContent, /id="neo-date-error"/);
  assert.match(htmlContent, /id="neo-status"/);
  assert.match(htmlContent, /id="neo-cache-banner"/);
  assert.match(htmlContent, /id="neo-use-cache-btn"/);
  assert.match(htmlContent, /id="neo-grid"/);

  // Статистическая плашка и фильтры
  assert.match(htmlContent, /id="neo-stats-bar"/);
  assert.match(htmlContent, /id="stat-total-count"/);
  assert.match(htmlContent, /id="stat-hazardous-count"/);
  assert.match(htmlContent, /id="stat-closest-distance"/);
  assert.match(htmlContent, /id="neo-filter-all"/);
  assert.match(htmlContent, /id="neo-filter-hazard"/);
  assert.match(htmlContent, /id="neo-search-input"/);
  assert.match(htmlContent, /id="neo-sort-select"/);

  // Вью Валютного конвертера
  assert.match(htmlContent, /id="view-rates"/);
  assert.match(htmlContent, /id="converter"/);
  assert.match(htmlContent, /id="amount"/);
  assert.match(htmlContent, /id="from"/);
  assert.match(htmlContent, /id="to"/);
  assert.match(htmlContent, /id="swap"/);
  assert.match(htmlContent, /id="date"/);
  assert.match(htmlContent, /id="convert"/);
  assert.match(htmlContent, /id="result"/);
});

test('UI Доступность (a11y): наличие aria-атрибутов, меток и доступных описаний', () => {
  // Проверка связки aria-describedby и полей ошибок
  assert.match(htmlContent, /id="neo-date"[^>]*aria-describedby="neo-date-error"/);
  assert.match(htmlContent, /id="neo-date-error"[^>]*aria-live="polite"/);

  assert.match(htmlContent, /id="amount"[^>]*aria-describedby="amount-error"/);
  assert.match(htmlContent, /id="amount-error"[^>]*aria-live="polite"/);

  assert.match(htmlContent, /id="neo-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(htmlContent, /id="neo-cache-banner"[^>]*role="alert"/);

  // Доступные метки для скринридеров
  assert.match(htmlContent, /aria-label="Переключение лабораторного варианта"/);
  assert.match(htmlContent, /aria-label="Список обнаруженных околоземных астероидов"/);
  assert.match(htmlContent, /aria-label="Результат конвертации"/);
});

test('UI Рендеринг карточки: генерация разметки для безопасного объекта', () => {
  const safeItem = parseAsteroidItem({
    id: '433',
    name: '433 Eros (A898 PA)',
    is_potentially_hazardous_asteroid: false,
    nasa_jpl_url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=433',
    estimated_diameter: {
      meters: { estimated_diameter_min: 16840.0, estimated_diameter_max: 37650.0 }
    },
    close_approach_data: [{
      close_approach_date_full: '2026-Nov-18 12:00',
      relative_velocity: { kilometers_per_second: '5.57', kilometers_per_hour: '20052.0' },
      miss_distance: { kilometers: '26700000.0', lunar: '69.5' }
    }]
  });

  assert.equal(safeItem.is_potentially_hazardous, false);
  assert.match(safeItem.diameter.formatted, /16,84 – 37,65 км/);
  assert.match(safeItem.distance.formatted_lunar, /69,5 LD/);
});

test('UI Рендеринг карточки: генерация разметки для опасного объекта (PHA)', () => {
  const hazardItem = parseAsteroidItem({
    id: '99942',
    name: '99942 Apophis (2004 MN4)',
    is_potentially_hazardous_asteroid: true,
    nasa_jpl_url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=99942',
    estimated_diameter: {
      meters: { estimated_diameter_min: 340.0, estimated_diameter_max: 370.0 }
    },
    close_approach_data: [{
      close_approach_date_full: '2029-Apr-13 21:46',
      relative_velocity: { kilometers_per_second: '7.43', kilometers_per_hour: '26748.0' },
      miss_distance: { kilometers: '38000.0', lunar: '0.1' }
    }]
  });

  assert.equal(hazardItem.is_potentially_hazardous, true);
  assert.match(hazardItem.diameter.formatted, /340 – 370 м/);
  assert.match(hazardItem.velocity.formatted_sec, /7,4 км\/с/);
  assert.match(hazardItem.distance.formatted_lunar, /0,1 LD/);
});

test('UI Стили: styles.css содержит космическую цветовую палитру и адаптивные медиа-запросы', () => {
  // Цветовые токены
  assert.match(cssContent, /--bg-space:\s*#0b0f19/);
  assert.match(cssContent, /--accent-cyan:\s*#38bdf8/);
  assert.match(cssContent, /--hazard-red:\s*#ef4444/);
  assert.match(cssContent, /--safe-green:\s*#10b981/);

  // Анимация пульсации бейджа опасности
  assert.match(cssContent, /@keyframes pulse-hazard/);

  // Адаптивность для планшетов и мобильных устройств
  assert.match(cssContent, /@media\s*\(\s*max-width:\s*900px\s*\)/);
  assert.match(cssContent, /@media\s*\(\s*max-width:\s*640px\s*\)/);
});

test('UI Валютного конвертера: форматирование денежных сумм для JPY и EUR', () => {
  assert.equal(formatMoney(100.5, 'EUR'), '100,50');
  assert.equal(formatMoney(12500, 'JPY'), '12\u00A0500'); // Японская иена без дробной части
  assert.equal(formatMoney(0.99, 'USD'), '0,99');
});
