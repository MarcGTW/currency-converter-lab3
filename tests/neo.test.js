import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCalendarDateValid,
  isLeapYear,
  getDaysInMonth,
  validateNeoDate,
  formatDiameter,
  formatVelocity,
  formatDistance,
  parseAsteroidItem,
  parseNeoResponse,
  validateNeoSnapshot,
  filterAndSortAsteroids,
  NASA_SOURCE
} from '../public/neo-core.js';
import { loadNeoData } from '../lib/neo.js';
import { saveNeoCache, loadNeoCache, clearNeoCache, CACHE_STORAGE_KEY } from '../public/neo-cache.js';

// Фикстура реального ответа NASA NeoWs
const SAMPLE_NASA_PAYLOAD = {
  element_count: 2,
  near_earth_objects: {
    '2026-11-18': [
      {
        id: '1001',
        name: 'Asteroid Alpha (2026 AA)',
        is_potentially_hazardous_asteroid: false,
        nasa_jpl_url: 'https://ssd.jpl.nasa.gov/1001',
        absolute_magnitude_h: 22.4,
        estimated_diameter: {
          meters: {
            estimated_diameter_min: 80.5,
            estimated_diameter_max: 180.2
          }
        },
        close_approach_data: [
          {
            close_approach_date: '2026-11-18',
            close_approach_date_full: '2026-Nov-18 10:30',
            relative_velocity: {
              kilometers_per_second: '14.52',
              kilometers_per_hour: '52272.0'
            },
            miss_distance: {
              kilometers: '15000000.0',
              lunar: '39.0'
            }
          }
        ]
      },
      {
        id: '2002',
        name: 'Asteroid Danger (2026 DD)',
        is_potentially_hazardous_asteroid: true,
        nasa_jpl_url: 'https://ssd.jpl.nasa.gov/2002',
        absolute_magnitude_h: 18.1,
        estimated_diameter: {
          meters: {
            estimated_diameter_min: 1200.0,
            estimated_diameter_max: 2500.0
          }
        },
        close_approach_data: [
          {
            close_approach_date: '2026-11-18',
            close_approach_date_full: '2026-Nov-18 18:45',
            relative_velocity: {
              kilometers_per_second: '28.10',
              kilometers_per_hour: '101160.0'
            },
            miss_distance: {
              kilometers: '4500000.0',
              lunar: '11.7'
            }
          }
        ]
      }
    ]
  }
};

test('календарная валидация: високосный год и количество дней в месяцах', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);

  assert.equal(getDaysInMonth(2024, 2), 29);
  assert.equal(getDaysInMonth(2026, 2), 28);
  assert.equal(getDaysInMonth(2026, 4), 30);
  assert.equal(getDaysInMonth(2026, 1), 31);

  assert.equal(isCalendarDateValid('2024-02-29'), true);
  assert.equal(isCalendarDateValid('2026-02-29'), false);
  assert.equal(isCalendarDateValid('2026-02-31'), false);
  assert.equal(isCalendarDateValid('2026-04-31'), false);
  assert.equal(isCalendarDateValid('2026-11-18'), true);
  assert.equal(isCalendarDateValid('not-a-date'), false);
  assert.equal(isCalendarDateValid('2026-13-01'), false);
});

test('валидация пользовательского ввода даты: сообщения об ошибках', () => {
  assert.equal(validateNeoDate('2026-11-18'), '');
  assert.match(validateNeoDate(''), /Укажите дату/);
  assert.match(validateNeoDate('2026/11/18'), /Формат даты/);
  assert.match(validateNeoDate('2026-02-31'), /несуществующая календарная дата/);
  assert.match(validateNeoDate('1899-12-31'), /не может быть ранее/);
  assert.match(validateNeoDate('2030-01-01', { max: '2028-01-01' }), /не может превышать/);
});

test('разбор ответа NASA NeoWs: структура объектов, флаги опасности и метрики', () => {
  const result = parseNeoResponse(SAMPLE_NASA_PAYLOAD, '2026-11-18');
  assert.equal(result.date, '2026-11-18');
  assert.equal(result.element_count, 2);
  assert.equal(result.asteroids.length, 2);
  assert.equal(result.source, NASA_SOURCE);

  const safeObj = result.asteroids[0];
  assert.equal(safeObj.id, '1001');
  assert.equal(safeObj.is_potentially_hazardous, false);
  assert.equal(safeObj.diameter.formatted, '81 – 180 м');
  assert.match(safeObj.velocity.formatted_sec, /14,5/);
  assert.match(safeObj.distance.formatted_lunar, /39,0/);

  const hazardObj = result.asteroids[1];
  assert.equal(hazardObj.id, '2002');
  assert.equal(hazardObj.is_potentially_hazardous, true);
  // Диаметр >= 1000м форматируется в километрах
  assert.equal(hazardObj.diameter.formatted, '1,20 – 2,50 км');
  assert.match(hazardObj.distance.formatted_lunar, /11,7/);
});

test('поведение при пустом ответе источника (пустой день)', () => {
  const emptyPayload = { element_count: 0, near_earth_objects: {} };
  const result = parseNeoResponse(emptyPayload, '2026-11-18');
  assert.equal(result.date, '2026-11-18');
  assert.equal(result.element_count, 0);
  assert.deepEqual(result.asteroids, []);
  assert.equal(result.source, NASA_SOURCE);
});

test('поведение при поврежденном ответе источника', () => {
  assert.throws(() => parseNeoResponse(null, '2026-11-18'), /некорректный ответ/);
  assert.throws(() => parseNeoResponse('not-json', '2026-11-18'), /некорректный ответ/);
});

test('фильтрация и сортировка астероидов', () => {
  const parsed = parseNeoResponse(SAMPLE_NASA_PAYLOAD, '2026-11-18');
  const allList = parsed.asteroids;

  // Фильтр только опасных
  const hazardousOnly = filterAndSortAsteroids(allList, { filter: 'hazardous' });
  assert.equal(hazardousOnly.length, 1);
  assert.equal(hazardousOnly[0].id, '2002');

  // Поиск по имени
  const searched = filterAndSortAsteroids(allList, { searchQuery: 'alpha' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, '1001');

  // Сортировка по расстоянию (сначала ближайшие)
  const sortedDist = filterAndSortAsteroids(allList, { sortBy: 'distance' });
  assert.equal(sortedDist[0].id, '2002'); // 4.5 млн км против 15 млн км
  assert.equal(sortedDist[1].id, '1001');

  // Сортировка по скорости
  const sortedVel = filterAndSortAsteroids(allList, { sortBy: 'velocity' });
  assert.equal(sortedVel[0].id, '2002'); // 28.1 км/с против 14.52 км/с
});

test('кэширование снимка: сохранение, загрузка и защита от битых данных', () => {
  const mockStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, val) { this.data[key] = String(val); },
    removeItem(key) { delete this.data[key]; }
  };

  const snapshot = parseNeoResponse(SAMPLE_NASA_PAYLOAD, '2026-11-18');
  const saved = saveNeoCache(snapshot, mockStorage);
  assert.equal(saved, true);

  const loaded = loadNeoCache(mockStorage);
  assert.ok(loaded);
  assert.equal(loaded.date, '2026-11-18');
  assert.equal(loaded.asteroids.length, 2);

  // Поврежденный JSON
  mockStorage.data[CACHE_STORAGE_KEY] = '{ corrupted json';
  assert.equal(loadNeoCache(mockStorage), null);

  // Невалидная схема (отсутствует список астероидов)
  mockStorage.data[CACHE_STORAGE_KEY] = JSON.stringify({ date: '2026-11-18', source: 'NASA' });
  assert.equal(loadNeoCache(mockStorage), null);
});

test('серверный загрузчик loadNeoData: вызов mock-fetcher и ошибки', async () => {
  // Успешный мок
  const mockFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => SAMPLE_NASA_PAYLOAD
  });
  const data = await loadNeoData('2026-11-18', { fetcher: mockFetcher });
  assert.equal(data.element_count, 2);

  // Мок с HTTP 429
  const rateLimitFetcher = async () => ({
    ok: false,
    status: 429,
    json: async () => ({})
  });
  await assert.rejects(
    () => loadNeoData('2026-11-18', { fetcher: rateLimitFetcher }),
    /HTTP 429/
  );

  // Сетевой сбой
  const networkFailFetcher = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    () => loadNeoData('2026-11-18', { fetcher: networkFailFetcher }),
    /Не удалось связаться с сервером NASA API/
  );
});
