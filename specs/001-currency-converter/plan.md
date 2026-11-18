# Технический план

- Node.js 22+ (рекомендуется 24), стандартные модули, без npm-зависимостей.
- Локальный HTTP-сервер на 127.0.0.1:3000 обслуживает public/ и GET /api/rates?date=YYYY-MM-DD. Проксирует только фиксированный HTTPS endpoint Frankfurter, пользователь не задаёт URL.
- public/core.js: список валют, валидация суммы/даты, парсер v2, конвертация.
- lib/rates.js: загрузка через fetch с AbortSignal.timeout, проверка JSON, поиск предыдущего дня при пустом массиве, исключение курсов из будущего.
- public/cache.js: версия записи localStorage, дата загрузки, проверка при чтении, обработка SecurityError/QuotaExceededError.
- public/app.js: DOM, состояния загрузки/ошибки/предложения кэша/результата. При изменении даты отменять старые запросы; результат скрывать при любом изменении ввода.
- public/index.html и styles.css: светлая карточка конвертации, тёмная боковая панель результата, адаптивная сетка, явные label, aria-live.
- node:test и assert/strict: независимые фикстуры, подставной fetch и storage. Тесты не зависят от сети.
- Кэш хранится в браузере конкретного origin. Не обещать загрузку страницы при выключенном локальном сервере.

Endpoint: https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,GBP,CHF,JPY,CAD,AUD,CNY,PLN,SEK&providers=ecb&date=YYYY-MM-DD

Документация: https://frankfurter.dev/ и https://github.github.io/spec-kit/reference/agentic-sdd.html (проверены 21.10.2026).
