/**
 * Чистая бизнес-логика для трекера околоземных астероидов (NASA NEO Tracker).
 * Не содержит зависимостей от DOM и может исполняться как в браузере, так и в тестах Node.js.
 */

export const MIN_NEO_DATE = '1900-01-01';
export const NASA_SOURCE = 'NASA JPL NeoWs (Near Earth Object Web Service)';

/**
 * Проверка високосного года по астрономическому григорианскому правилу.
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Получение максимального числа дней в месяце с учетом високосности.
 */
export function getDaysInMonth(year, month) {
  if (month < 1 || month > 12) return 0;
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/**
 * Строгая проверка формата даты ГГГГ-ММ-ДД и календарной валидности (защита от 31 февраля и т.д.).
 */
export function isCalendarDateValid(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  const maxDay = getDaysInMonth(year, month);
  return day >= 1 && day <= maxDay;
}

/**
 * Валидация даты для формы с информативным сообщением об ошибке на русском языке.
 */
export function validateNeoDate(value, { min = MIN_NEO_DATE, max } = {}) {
  const text = String(value ?? '').trim();
  if (!text) return 'Укажите дату наблюдения.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return 'Формат даты должен быть ГГГГ-ММ-ДД.';
  if (!isCalendarDateValid(text)) {
    return 'Указана несуществующая календарная дата (например, 31 февраля).';
  }
  if (text < min) return `Дата не может быть ранее ${min}.`;
  if (max && text > max) return `Дата не может превышать ${max}.`;
  return '';
}

/**
 * Получение текущей даты в формате YYYY-MM-DD в локальном часовом поясе.
 */
export function localToday(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Форматирование числа с разделителями тысяч для русской локали.
 */
export function formatThousands(num, maxDecimals = 0) {
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0
  }).format(num);
}

/**
 * Форматирование диапазона диаметра (в метрах или километрах).
 */
export function formatDiameter(minMeters, maxMeters) {
  if (!Number.isFinite(minMeters) || !Number.isFinite(maxMeters) || minMeters <= 0 || maxMeters <= 0) {
    return 'Не определен';
  }
  if (maxMeters >= 1000) {
    const minKm = (minMeters / 1000).toFixed(2).replace('.', ',');
    const maxKm = (maxMeters / 1000).toFixed(2).replace('.', ',');
    return `${minKm} – ${maxKm} км`;
  }
  return `${Math.round(minMeters)} – ${Math.round(maxMeters)} м`;
}

/**
 * Форматирование скорости сближения.
 */
export function formatVelocity(kmPerSec, kmPerHour) {
  const sec = Number.isFinite(kmPerSec) ? `${kmPerSec.toFixed(1).replace('.', ',')} км/с` : '—';
  const hour = Number.isFinite(kmPerHour) ? `${formatThousands(Math.round(kmPerHour))} км/ч` : '—';
  return { sec, hour };
}

/**
 * Форматирование расстояния пролета (км и лунные дистанции LD).
 */
export function formatDistance(km, lunar) {
  const kmStr = Number.isFinite(km) ? `${formatThousands(Math.round(km))} км` : '—';
  const ldStr = Number.isFinite(lunar) ? `${lunar.toFixed(1).replace('.', ',')} LD` : '—';
  return { km: kmStr, lunar: ldStr };
}

/**
 * Разбор единичного астероида из сырого объекта NASA NeoWs.
 */
export function parseAsteroidItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || raw.neo_reference_id || 'unknown');
  const name = String(raw.name || 'Безымянный объект');
  const isHazardous = Boolean(raw.is_potentially_hazardous_asteroid);
  const jplUrl = raw.nasa_jpl_url || `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(id)}`;
  const magnitude = Number.isFinite(raw.absolute_magnitude_h) ? raw.absolute_magnitude_h : null;

  const diam = raw.estimated_diameter?.meters || {};
  const minMeters = Number(diam.estimated_diameter_min);
  const maxMeters = Number(diam.estimated_diameter_max);
  const diameterFormatted = formatDiameter(minMeters, maxMeters);

  const approach = Array.isArray(raw.close_approach_data) && raw.close_approach_data[0] ? raw.close_approach_data[0] : {};
  const velSec = approach.relative_velocity ? Number(approach.relative_velocity.kilometers_per_second) : NaN;
  const velHour = approach.relative_velocity ? Number(approach.relative_velocity.kilometers_per_hour) : NaN;
  const velocityFormatted = formatVelocity(velSec, velHour);

  const missKm = approach.miss_distance ? Number(approach.miss_distance.kilometers) : NaN;
  const missLunar = approach.miss_distance ? Number(approach.miss_distance.lunar) : NaN;
  const distanceFormatted = formatDistance(missKm, missLunar);

  const approachDateFull = approach.close_approach_date_full || approach.close_approach_date || '—';

  return {
    id,
    name,
    is_potentially_hazardous: isHazardous,
    nasa_jpl_url: jplUrl,
    absolute_magnitude: magnitude,
    diameter: {
      min_meters: minMeters,
      max_meters: maxMeters,
      formatted: diameterFormatted
    },
    velocity: {
      km_per_sec: velSec,
      km_per_hour: velHour,
      formatted_sec: velocityFormatted.sec,
      formatted_hour: velocityFormatted.hour
    },
    distance: {
      kilometers: missKm,
      lunar: missLunar,
      formatted_km: distanceFormatted.km,
      formatted_lunar: distanceFormatted.lunar
    },
    close_approach_date_full: approachDateFull
  };
}

/**
 * Разбор полного ответа NASA NeoWs Feed API.
 */
export function parseNeoResponse(payload, targetDate) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Источник данных NASA вернул некорректный ответ.');
  }

  const rawList = payload.near_earth_objects?.[targetDate];
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return {
      date: targetDate,
      element_count: 0,
      asteroids: [],
      source: NASA_SOURCE,
      fetched_at: new Date().toISOString()
    };
  }

  const asteroids = rawList
    .map(parseAsteroidItem)
    .filter(Boolean);

  return {
    date: targetDate,
    element_count: asteroids.length,
    asteroids,
    source: NASA_SOURCE,
    fetched_at: new Date().toISOString()
  };
}

/**
 * Валидация структуры сохраненного снимка астероидов.
 */
export function validateNeoSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Некорректный формат снимка кэша.');
  if (!isCalendarDateValid(snapshot.date)) throw new Error('Некорректная дата в снимке кэша.');
  if (!Array.isArray(snapshot.asteroids)) throw new Error('В снимке кэша отсутствует список астероидов.');
  if (typeof snapshot.source !== 'string') throw new Error('В снимке отсутствует источник данных.');
  return snapshot;
}

/**
 * Фильтрация и сортировка списка астероидов для рендеринга.
 */
export function filterAndSortAsteroids(asteroids, { filter = 'all', sortBy = 'distance', searchQuery = '' } = {}) {
  if (!Array.isArray(asteroids)) return [];

  let result = asteroids.slice();

  // Фильтр по опасности
  if (filter === 'hazardous') {
    result = result.filter(a => a.is_potentially_hazardous);
  }

  // Фильтр по поисковой строке
  const query = searchQuery.trim().toLowerCase();
  if (query) {
    result = result.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query)
    );
  }

  // Сортировка
  result.sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return (a.distance.kilometers || Infinity) - (b.distance.kilometers || Infinity);
      case 'diameter':
        return (b.diameter.max_meters || 0) - (a.diameter.max_meters || 0);
      case 'velocity':
        return (b.velocity.km_per_sec || 0) - (a.velocity.km_per_sec || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return result;
}
