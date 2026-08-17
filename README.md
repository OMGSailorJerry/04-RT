# 04-RT · Radio Noise Map

Інтерактивна карта моніторингу радіоелектронної обстановки.
Генератор mock-даних у форматі `mock_zones.json`.

**Live:** https://radio-noise-map.vercel.app

---

## Запуск

```bash
npm install
npm start        # → http://localhost:4200
npm run build    # production build
```

---

## Що реалізовано

### Friendly-зони (РЕБ свої)

- Клік по карті → форма в сайдбарі (займає весь сайдбар, список/деталі ховаються)
- Вибір типу емісії: **RADIAL** (кругова) або **SECTOR** (секторна діаграма)
- **RADIAL**: `gridDisk` навколо центру, радіус від потужності: `k = round(power/5)`, від 2 до 20 кілець
- **SECTOR**: haversine destination formula, кут + азимут, gain = `√(360/beamAngle)` (фізика антени)
- Слайдер потужності 1–100 → автоматично визначає рівень шуму:
  - 1–25 → LOW (синій `#4FAFCB`)
  - 26–50 → MEDIUM (янтарний `#D8A247`)
  - 51–75 → HIGH (оранжевий `#F05A28`)
  - 76–100 → CRITICAL (червоний `#E53535`)
- Live preview зони на карті під час налаштування
- **Cell Edit Mode**: після збереження — кнопка EDIT CELLS, клік по карті додає/видаляє окремі H3-ячейки
- Зберігається в `localStorage` (ключ `rnm_v5`)

### Enemy-засоби (РЕБ ворожі)

- Кнопка `⊗ ENEMY` в хедері вмикає enemy mode
- Клік по карті → ставить ворожий засіб (червоний маркер `×`)
- Автоматично генерується: випадкова назва РЕБ-системи + 2–4 частотних діапазони
- Назви: Р-934У, Борисоглебськ-2, Красуха-4, Москва-1, Хибіни, Леер-3, Репеллент, Мурманськ-БН
- Клік по маркеру — видаляє його
- Зберігається в `localStorage` (ключ `rnm_enemy_v1`)
- Взаємовиключний з emission form та cell edit mode

### Експорт

| Кнопка | Формат | Файл |
|---|---|---|
| ↓ EXPORT JSON | GeoJSON FeatureCollection | `mock_zones.json` |
| ↓ EXPORT CSV | CSV з усіма friendly-записами | `radio-noise-YYYY-MM-DD.csv` |

**Friendly feature** в JSON:
```json
{
  "type": "Feature",
  "properties": {
    "affiliation": "friendly",
    "frequencies": [{ "from": 420, "to": 520 }],
    "type": "ecm_active",
    "updated_at": "2025-10-02T08:11:59Z",
    "name": "<uuid>",
    "zone_id": "<uuid>",
    "h3Index": "<h3-cell>",
    "fill": "blue"
  },
  "geometry": { "type": "Polygon", "coordinates": [[ /* ±0.005° box */ ]] }
}
```

**Enemy feature** в JSON:
```json
{
  "type": "Feature",
  "properties": {
    "affiliation": "enemy",
    "frequencies": [{ "from": 900, "to": 1050 }, { "from": 2400, "to": 2700 }],
    "type": "ecm_active",
    "updated_at": "...",
    "name": "<uuid>",
    "zone_id": "<uuid>",
    "h3Index": "<h3-cell>",
    "position": [32.045, 48.512],
    "ew_name": "Красуха-4",
    "fill": "#f56b6b"
  },
  "geometry": { "type": "Polygon", "coordinates": [[ /* ±0.03° circle, 36 pts */ ]] }
}
```

---

## Архітектура

```
src/app/
├── models/
│   └── noise-reading.model.ts     # NoiseReading, EnemyAsset, NoiseLevel, Band,
│                                  # getBand(), getNoiseColor(), EW_NAMES, randomEwFreqs()
├── services/
│   ├── radio-noise.service.ts     # Signal-store: readings + enemyAssets, localStorage
│   └── ui-state.service.ts        # selectedId, formMode, mapPending, cellEditId, enemyMode
├── utils/
│   └── cell-generator.ts          # generateCells(), powerToK(), powerToNoiseLevel(), H3_RES=7
└── components/
    ├── map/                        # Leaflet-карта, H3-гексагони, enemy-маркери, hover-cell
    ├── frequency-list/             # Список friendly-записів, edit/delete
    ├── frequency-detail/           # Деталі запису + кнопка EDIT CELLS
    └── emission-form/              # Форма додавання/редагування (займає весь сайдбар)
```

### Ключові технічні деталі

- **Angular 17+** standalone components, `ChangeDetectionStrategy.OnPush`, signals
- **H3-js v4**: resolution 7 (~1.41 km ребро), `gridDisk`, `polygonToCells`, `cellsToMultiPolygon`, `latLngToCell`
- **Leaflet**: растрові тайли CartoDB Dark, SVG-полігони, `divIcon` для міток
- Reactive sync через `effect()` — карта оновлюється автоматично при зміні signal
- Сектор: haversine destination formula, 32 точки дуги

---

## Можливі розширення

- [ ] Імпорт `mock_zones.json` назад на карту
- [ ] Фільтрація по частоті / рівню / типу
- [ ] WebSocket для real-time оновлень
- [ ] Редагування параметрів enemy-засобу (частоти, назва)
- [ ] Heatmap-шар (Leaflet.heat) по щільності зон
