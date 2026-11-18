# NASA NEO Tracker & Currency Converter

[![Tests](https://img.shields.io/badge/tests-37%20passed-success)](https://github.com/MarcGTW/currency-converter-lab3)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-blue)](https://nodejs.org/)
[![Spec--Driven Development](https://img.shields.io/badge/methodology-Spec--Driven%20Development-purple)](https://github.com/github/spec-kit)
[![Platform](https://img.shields.io/badge/built%20with-Google%20Antigravity-orange)](https://antigravity.google)

> **Language**: **English** | [Читать на русском](README.ru.md)

A dual-mode desktop-ready web application built following the **Spec-Driven Development (SDD)** lifecycle using **GitHub Spec Kit** specifications and assembled with **Google Antigravity** (powered by **Gemini 3.8 Flash**).

---

## Overview & Application Modes

The application integrates two fully-featured modules accessible via a sleek header switcher:

### 1. 🚀 NASA NEO Tracker (Near Earth Object Monitoring) — *Main Variant*
- **Live Data Source**: Official [NASA JPL NeoWs (Near Earth Object Web Service)](https://api.nasa.gov/) REST API feed.
- **Detailed Physical Telemetry**:
  - Estimated minimum and maximum diameters (in meters or kilometers for objects $\ge 1000\text{ m}$).
  - Relative velocity in $\text{km/s}$ and $\text{km/h}$ with locale-aware thousand separators.
  - Miss distance in kilometers and Lunar Distances ($\text{LD}$, $1\text{ LD} \approx 384{,}400\text{ km}$).
  - Exact close approach timestamp.
- **Hazard Classification**: Instant visual alerts for potentially hazardous asteroids (`is_potentially_hazardous_asteroid === true`) with glowing warning badges and a dedicated hazard filter.
- **Interactive Tools**: Full-text search by name or ID, dynamic sorting (by closest distance, largest diameter, highest velocity, or alphabetical name).
- **Offline & Empty Day Resilience**:
  - Automatically handles days with no recorded approaches (`element_count: 0`) and offers the latest verified cached snapshot.
  - Offline fallback: alerts the user with graceful error messages and provides a one-click button to load cached data.
- **Persistent Local Cache**: Stored in `localStorage` (`neo_tracker_snapshot_v1`), surviving tab closes, browser restarts, and server reboots.

### 2. 💱 Currency Converter (ECB Reference Rates) — *Base Module*
- **Data Source**: European Central Bank reference rates via [Frankfurter v2](https://frankfurter.dev/).
- **Supported Currencies**: 10 official ECB currencies (`EUR`, `USD`, `GBP`, `CHF`, `JPY`, `CAD`, `AUD`, `CNY`, `PLN`, `SEK`).
- **Features**: Real-time validation, comma/dot decimal handling, currency swap button, 10-day lookback for bank holidays/weekends, and local persistence.

---

## Quickstart

Requires **Node.js 22+** (recommended: 22 or 24). Uses native Node.js APIs (`node:http`, `node:test`, `node:fs`). **Zero external npm dependencies required.**

```bash
# Clone the repository
git clone https://github.com/MarcGTW/currency-converter-lab3.git
cd currency-converter-lab3

# Launch the server (npm install is NOT needed)
npm start
```

Open your browser at: **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

If port 3000 is occupied, set an alternative port:
```powershell
$env:PORT = '3001'
npm start
```

---

## Testing & Quality Assurance

All unit, integration, and UI tests execute via Node.js native test runner (`node:test`) without requiring external network connectivity:

```bash
# Run all 37 tests
npm test

# Run UI tests only
npm run test:ui

# Run with test coverage
npm run test:coverage
```

### Test Suite Breakdown (37 Tests · 100% Passing):
- **Calendar & Date Validation**:
  - Gregorian leap year calculation (e.g., 2024 is leap, 2026 and 1900 are not, 2000 is).
  - Rejection of invalid calendar dates (February 31, February 29 on non-leap years, April 31, malformed inputs).
- **NASA API Parser & Calculations**:
  - Extraction of asteroid telemetry, unit conversions, and PHA flags.
  - Empty response handling (`element_count: 0`).
  - Corruption handling (malformed JSON, missing fields).
- **Filter & Search Engine**:
  - Hazard-only filtering.
  - Sorting algorithms (distance ascending, diameter descending, speed descending).
  - Search matching.
- **Cache Integrity & Storage**:
  - LocalStorage snapshot read/write, schema validation, defense against corrupted payloads.
- **Network Proxy & Rate Limits**:
  - Mock loader simulating HTTP 200, HTTP 429 Rate Limit, and network timeouts.
- **Currency Core & Calculations**:
  - Direct, inverse, cross, and identical currency conversions without floating-point drift.
  - 10-day lookback for weekend exchange rates.
- **UI & Accessibility (a11y)**:
  - Validates `index.html` structure, semantic tags, and ARIA attributes (`aria-describedby`, `aria-live`, `role="tab"`, `role="status"`).
  - Card rendering logic for safe vs hazardous asteroid states.
  - Responsive design tokens in `styles.css`.

---

## Edge Case Scenarios

| Scenario | User Action | Application Behavior |
| :--- | :--- | :--- |
| **Invalid Date** | Enter `2026-02-31` | Displays error: *"Non-existent calendar date (e.g., Feb 31)"*. Button is disabled. |
| **Network Failure** | Disconnect Wi-Fi / stop connection | Displays friendly error banner with *"Load cached snapshot from YYYY-MM-DD"*. |
| **Empty Day** | Select date with 0 registered NEOs | Warns user that NASA has no records for the day and offers the latest cached date. |
| **Potentially Hazardous** | Click *"⚠️ Only Hazardous"* | Filters list to show only asteroids with `is_potentially_hazardous_asteroid === true` with crimson glow. |
| **Identical Currencies** | Convert USD → USD | Returns exact input amount without calculation drift. |

---

## Spec-Driven Development Directory Structure

```
├── .specify/
│   └── memory/
│       └── constitution.md     # Project constitution & SDD principles
├── specs/
│   ├── 001-currency-converter/ # Currency converter spec, plan, tasks, analysis
│   └── 002-nasa-neo-tracker/   # NASA NEO tracker spec, plan, tasks, analysis
├── lib/
│   ├── neo.js                  # NASA NeoWs API proxy & fetcher
│   └── rates.js                # ECB exchange rates loader
├── public/
│   ├── index.html              # Dual-mode responsive GUI layout
│   ├── styles.css              # Deep space cosmic theme & design tokens
│   ├── neo-core.js             # Pure business logic: date validation, parsing, sorting
│   ├── neo-cache.js            # LocalStorage cache manager for NEO data
│   ├── neo-app.js              # GUI controller for NEO tracker
│   ├── app.js                  # App bootstrap & view router
│   ├── core.js                 # Currency conversion business logic
│   └── cache.js                # Currency cache manager
├── tests/
│   ├── neo.test.js             # Unit tests for NASA NEO logic
│   ├── ui.test.js              # UI component, layout, and a11y tests
│   ├── server.test.js          # HTTP server & API endpoint tests
│   ├── core.test.js            # Currency core unit tests
│   ├── rates.test.js           # Currency loader tests
│   └── cache.test.js           # Currency cache tests
├── server.js                   # Lightweight native HTTP server & API proxy
├── README.md                   # English project documentation (this file)
├── README.ru.md                # Russian project documentation
└── REPORT.md                   # Academic report for Laboratory Work #3
```

---

## Git Workflow & Branch Strategy

In strict adherence to laboratory requirements, each phase was conducted in an isolated branch and merged into `main` via PR merge commits:

1. `specs/nasa-neo-tracker` — markdown specifications written **prior** to any code.
2. `feat/nasa-neo-tracker` — implementation of business logic, API loaders, and cosmic UI.
3. `test/nasa-neo-tracker` — comprehensive test coverage (37 tests), documentation, and report.
4. `main` — production branch with clean PR merges (`#1`, `#2`, `#3`, `#4`).

---

## License & Attribution

- Built as Laboratory Work #3 for Prompt Engineering & Spec-Driven Development course.
- Data provided by [NASA JPL NeoWs](https://api.nasa.gov/) and [European Central Bank](https://www.ecb.europa.eu/).
