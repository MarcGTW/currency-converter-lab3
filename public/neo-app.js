import {
  formatDiameter,
  formatDistance,
  formatThousands,
  formatVelocity,
  isCalendarDateValid,
  localToday,
  validateNeoDate,
  filterAndSortAsteroids,
  NASA_SOURCE
} from './neo-core.js';
import { loadNeoCache, saveNeoCache } from './neo-cache.js';

// DOM elements
const neoDateInput = document.getElementById('neo-date');
const neoDateError = document.getElementById('neo-date-error');
const neoSubmitBtn = document.getElementById('neo-submit');
const neoStatusBox = document.getElementById('neo-status');
const neoCacheBanner = document.getElementById('neo-cache-banner');
const neoUseCacheBtn = document.getElementById('neo-use-cache-btn');
const neoGrid = document.getElementById('neo-grid');
const neoStatsBar = document.getElementById('neo-stats-bar');
const neoMetaSource = document.getElementById('neo-meta-source');
const neoMetaTime = document.getElementById('neo-meta-time');
const neoMetaMode = document.getElementById('neo-meta-mode');

// Filter & Sort elements
const filterAllBtn = document.getElementById('neo-filter-all');
const filterHazardBtn = document.getElementById('neo-filter-hazard');
const sortSelect = document.getElementById('neo-sort-select');
const searchInput = document.getElementById('neo-search-input');

// Quick date buttons
const quickTodayBtn = document.getElementById('neo-quick-today');
const quickYesterdayBtn = document.getElementById('neo-quick-yesterday');

// State
let currentSnapshot = null;
let activeFilter = 'all';
let currentSort = 'distance';
let currentSearch = '';

/**
 * Валидация текущего значения поля ввода даты и управление состоянием кнопки.
 */
function handleDateValidation() {
  const value = neoDateInput.value.trim();
  const error = validateNeoDate(value);
  neoDateError.textContent = error;
  neoDateInput.setAttribute('aria-invalid', error ? 'true' : 'false');
  neoSubmitBtn.disabled = Boolean(error);
  return !error;
}

/**
 * Отображение статусного сообщения.
 */
function showStatus(text, type = 'info') {
  neoStatusBox.className = `status-notice notice-${type}`;
  neoStatusBox.textContent = text;
  neoStatusBox.hidden = !text;
}

/**
 * Проверка наличия кэша и предложение его при необходимости.
 */
function checkAvailableCache(reasonText = '') {
  const cached = loadNeoCache();
  if (cached && cached.asteroids) {
    neoCacheBanner.hidden = false;
    const count = cached.asteroids.length;
    const cachedTime = cached.cached_at ? new Date(cached.cached_at).toLocaleTimeString('ru-RU') : '';
    neoCacheBanner.querySelector('.cache-msg').textContent =
      `${reasonText} Доступен ранее сохраненный снимок за ${cached.date} (${count} объектов${cachedTime ? ', время: ' + cachedTime : ''}).`;
    neoUseCacheBtn.onclick = () => {
      applySnapshot(cached, 'Кэш (локальное хранилище)');
      neoCacheBanner.hidden = true;
      neoDateInput.value = cached.date;
      handleDateValidation();
    };
  } else {
    neoCacheBanner.hidden = true;
  }
}

/**
 * Отрисовка сводной статистики в шапке результатов.
 */
function renderStats(asteroids) {
  if (!asteroids || asteroids.length === 0) {
    neoStatsBar.hidden = true;
    return;
  }
  neoStatsBar.hidden = false;

  const total = asteroids.length;
  const hazardous = asteroids.filter(a => a.is_potentially_hazardous).length;
  const closest = asteroids.reduce((prev, curr) =>
    (curr.distance.kilometers || Infinity) < (prev.distance.kilometers || Infinity) ? curr : prev, asteroids[0]);
  const fastest = asteroids.reduce((prev, curr) =>
    (curr.velocity.km_per_sec || 0) > (prev.velocity.km_per_sec || 0) ? curr : prev, asteroids[0]);

  document.getElementById('stat-total-count').textContent = `${total}`;
  document.getElementById('stat-hazardous-count').textContent = `${hazardous}`;
  document.getElementById('stat-closest-distance').textContent = closest.distance.formatted_lunar || closest.distance.formatted_km;
  document.getElementById('stat-closest-name').textContent = closest.name;
  document.getElementById('stat-fastest-speed').textContent = fastest.velocity.formatted_sec || '—';

  // Обновление счетчиков в кнопках фильтров
  filterAllBtn.textContent = `Все объекты (${total})`;
  filterHazardBtn.textContent = `⚠️ Потенциально опасные (${hazardous})`;
}

/**
 * Генерация HTML-разметки карточки астероида.
 */
function createAsteroidCard(item) {
  const isHaz = item.is_potentially_hazardous;
  const hazClass = isHaz ? 'card-hazard' : 'card-safe';
  const hazBadge = isHaz
    ? `<span class="badge badge-hazard" title="Объект классифицирован как потенциально опасный (PHA)">⚠️ Опасен (PHA)</span>`
    : `<span class="badge badge-safe">● Безопасен</span>`;

  return `
    <article class="neo-card ${hazClass}" tabindex="0" aria-label="Астероид ${item.name}">
      <header class="card-header">
        <div class="card-title-group">
          <span class="card-id">ID: ${item.id}</span>
          <h3 class="card-name">${item.name}</h3>
        </div>
        ${hazBadge}
      </header>

      <div class="card-metrics">
        <div class="metric-row">
          <span class="metric-label">📏 Оценочный диаметр</span>
          <strong class="metric-val">${item.diameter.formatted}</strong>
        </div>
        <div class="metric-row">
          <span class="metric-label">⚡ Скорость относительно Земли</span>
          <strong class="metric-val">${item.velocity.formatted_sec} <small>(${item.velocity.formatted_hour})</small></strong>
        </div>
        <div class="metric-row highlight-distance">
          <span class="metric-label">🛰️ Дистанция сближения</span>
          <div class="metric-split">
            <strong class="metric-val primary-val">${item.distance.formatted_km}</strong>
            <span class="metric-badge-ld">${item.distance.formatted_lunar}</span>
          </div>
        </div>
        <div class="metric-row">
          <span class="metric-label">⏱️ Максимальное сближение</span>
          <span class="metric-val-date">${item.close_approach_date_full}</span>
        </div>
      </div>

      <footer class="card-footer">
        <a href="${item.nasa_jpl_url}" target="_blank" rel="noopener noreferrer" class="jpl-link" title="Открыть карточку объекта в базе данных NASA JPL Small-Body Database">
          Справка NASA JPL ↗
        </a>
      </footer>
    </article>
  `;
}

/**
 * Отрисовка списка астероидов с учетом текущих фильтров и сортировки.
 */
function renderAsteroidList() {
  if (!currentSnapshot || !currentSnapshot.asteroids) {
    neoGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🪐</div>
        <p class="empty-title">Выберите дату и нажмите «Получить данные»</p>
        <p class="empty-desc">Астрономические данные по околоземным объектам будут загружены из базы NASA.</p>
      </div>
    `;
    return;
  }

  const filtered = filterAndSortAsteroids(currentSnapshot.asteroids, {
    filter: activeFilter,
    sortBy: currentSort,
    searchQuery: currentSearch
  });

  if (filtered.length === 0) {
    if (currentSnapshot.asteroids.length === 0) {
      neoGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌌</div>
          <p class="empty-title">Нет зарегистрированных сближений на эту дату</p>
          <p class="empty-desc">В выбранный день NASA не зафиксировало околоземных объектов на траектории сближения.</p>
        </div>
      `;
    } else {
      neoGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p class="empty-title">Ничего не найдено</p>
          <p class="empty-desc">По критериям фильтра и поиска нет совпадений среди ${currentSnapshot.asteroids.length} объектов.</p>
        </div>
      `;
    }
    return;
  }

  neoGrid.innerHTML = filtered.map(createAsteroidCard).join('');
}

/**
 * Применение снимка к пользовательскому интерфейсу.
 */
function applySnapshot(snapshot, modeLabel = 'Онлайн (NASA API)') {
  currentSnapshot = snapshot;
  renderStats(snapshot.asteroids || []);
  renderAsteroidList();

  neoMetaSource.textContent = snapshot.source || NASA_SOURCE;
  const time = snapshot.fetched_at ? new Date(snapshot.fetched_at).toLocaleTimeString('ru-RU') : new Date().toLocaleTimeString('ru-RU');
  neoMetaTime.textContent = `${snapshot.date}, ${time}`;
  neoMetaMode.textContent = modeLabel;
}

/**
 * Загрузка данных астероидов с сервера /api/neo.
 */
async function fetchAsteroids(date) {
  showStatus('Связываемся с NASA NeoWs API… Загрузка данных орбитального слежения…', 'loading');
  neoSubmitBtn.disabled = true;
  neoCacheBanner.hidden = true;

  try {
    const res = await fetch(`/api/neo?date=${encodeURIComponent(date)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Ошибка сервера NASA (HTTP ${res.status})`);
    }

    if (data.element_count === 0 || !data.asteroids || data.asteroids.length === 0) {
      showStatus(`На дату ${date} в каталоге NASA нет зарегистрированных пролетов околоземных астероидов.`, 'warning');
      applySnapshot(data, 'Нет объектов в каталоге');
      checkAvailableCache('Данные на выбранную дату отсутствуют.');
      return;
    }

    // Успешный ответ: сохраняем в постоянный кэш
    saveNeoCache(data);
    applySnapshot(data, 'Онлайн (NASA API)');
    showStatus(`Успешно получены данные NASA: обнаружено ${data.element_count} околоземных объектов на ${date}.`, 'success');
  } catch (err) {
    showStatus(`Сбой получения данных: ${err.message}`, 'error');
    checkAvailableCache('Не удалось загрузить свежие данные.');
  } finally {
    neoSubmitBtn.disabled = false;
  }
}

/**
 * Инициализация обработчиков событий модуля.
 */
export function initNeoApp() {
  // Установка сегодняшней даты по умолчанию
  const today = localToday();
  neoDateInput.value = today;
  handleDateValidation();

  // Проверка сохраненного кэша при старте
  const initialCache = loadNeoCache();
  if (initialCache) {
    applySnapshot(initialCache, 'Сохранено локально');
    showStatus(`Загружен ранее сохраненный сеанс за ${initialCache.date}. Вы можете запросить новую дату.`, 'info');
  }

  // События ввода даты
  neoDateInput.addEventListener('input', handleDateValidation);
  neoDateInput.addEventListener('change', handleDateValidation);

  // Быстрые кнопки даты
  if (quickTodayBtn) {
    quickTodayBtn.addEventListener('click', () => {
      neoDateInput.value = today;
      handleDateValidation();
      fetchAsteroids(today);
    });
  }

  if (quickYesterdayBtn) {
    quickYesterdayBtn.addEventListener('click', () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = localToday(d);
      neoDateInput.value = y;
      handleDateValidation();
      fetchAsteroids(y);
    });
  }

  // Отправка формы запроса
  document.getElementById('neo-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (handleDateValidation()) {
      fetchAsteroids(neoDateInput.value.trim());
    }
  });

  // Фильтрация
  filterAllBtn.addEventListener('click', () => {
    activeFilter = 'all';
    filterAllBtn.classList.add('active');
    filterHazardBtn.classList.remove('active');
    renderAsteroidList();
  });

  filterHazardBtn.addEventListener('click', () => {
    activeFilter = 'hazardous';
    filterHazardBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    renderAsteroidList();
  });

  // Сортировка
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderAsteroidList();
  });

  // Поиск
  searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value;
    renderAsteroidList();
  });
}
