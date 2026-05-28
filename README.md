# 📡 Radio Noise Map — Angular + Leaflet

Інтерактивна карта моніторингу радіоелектронної обстановки (РЕБ/радіошум).
Зроблено для відстеження рівнів придушення сигналу по географічних точках.

---

## Запуск

```bash
npm install
npm start
# → http://localhost:4200
```

---

## Архітектура

```
src/app/
├── models/
│   └── noise-reading.model.ts          # NoiseReading, NoiseLevel, Band, getBand(), getNoiseColor()
├── services/
│   ├── radio-noise.service.ts          # Signal-based сховище + localStorage (ключ rnm_v3)
│   └── ui-state.service.ts             # Глобальний UI-стан: selected, formMode, mapPending
└── components/
    ├── map/                             # Leaflet-карта, кліки, syncCircles()
    ├── frequency-list/                  # Ліст записів у сайдбарі, дропдаун ⋮ (edit/delete)
    ├── frequency-detail/                # Деталі вибраного запису
    ├── emission-form/                   # Форма додавання / редагування запису
    └── legend/                         # Легенда рівнів шуму (overlay на карті)
```

---

## Ключові патерни

### 1. Модель даних

```ts
export type NoiseLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Band = 'UHF' | 'L-BAND' | 'S-BAND' | 'C-BAND' | 'X-BAND';

export interface NoiseReading {
  id: string;
  lat: number;
  lng: number;
  h3Index: string;       // H3 hex-індекс (resolution 5)
  frequency: number;     // МГц
  noiseLevel: NoiseLevel;
  usage: number;         // 0–100 %
  band: Band;            // обчислюється з frequency
  notes?: string;
  timestamp: Date;
  color: string;         // обчислюється з noiseLevel
}
```

Бенди визначаються автоматично через `getBand(mhz)`:

| Бенд   | Діапазон (МГц) |
|--------|---------------|
| UHF    | < 1000        |
| L-BAND | 1000 – 1999   |
| S-BAND | 2000 – 3999   |
| C-BAND | 4000 – 7999   |
| X-BAND | ≥ 8000        |

### 2. Сервіс — Signal-based сховище

```ts
@Injectable({ providedIn: 'root' })
export class RadioNoiseService {
  private _readings = signal<NoiseReading[]>(this.loadFromStorage());
  readonly readings = this._readings.asReadonly();

  addReading(lat, lng, frequency, noiseLevel, usage, notes?): NoiseReading { ... }
  updateReading(id, frequency, noiseLevel, usage, notes?): void { ... }
  removeReading(id): void { ... }
  clearAll(): void { ... }
}
```

Дані зберігаються у `localStorage` під ключем `rnm_v3`. Всі компоненти читають через `readings` signal напряму.

### 3. UI-стан

```ts
@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly selectedId = signal<string | null>(null);
  readonly editingId  = signal<string | null>(null);
  readonly mapPending = signal<{ lat: number; lng: number } | null>(null);
  readonly formMode   = signal<'add' | 'edit' | null>(null);
}
```

`formMode` керує нижньою частиною сайдбару: `null` → `frequency-detail`, `'add'`/`'edit'` → `emission-form`.

### 4. Layout

```
┌────────────────────────────────────────┬──────────────────────┐
│                                        │  · FREQUENCIES       │
│                                        │  (список записів)    │
│           LEAFLET MAP                  ├──────────────────────┤
│           (повна висота)               │  FREQUENCY DETAIL    │
│                                        │    або               │
│                                        │  EMISSION FORM       │
└────────────────────────────────────────┴──────────────────────┘
```

Сайдбар (260px): `frequency-list` (`flex: 1`) + нижня панель (300px) з умовним рендерингом.

### 5. Обробка кліку по карті

```ts
this.map.on('click', (e: L.LeafletMouseEvent) => {
  this.uiState.startAdd(e.latlng.lat, e.latlng.lng);
});
```

`startAdd()` встановлює `mapPending` і `formMode = 'add'` → сайдбар перемикається на форму.

### 6. Реактивне оновлення кіл

```ts
effect(() => {
  this.syncCircles(this.noiseService.readings());
});

private syncCircles(readings: NoiseReading[]): void {
  const currentIds = new Set(readings.map(r => r.id));
  this.circleMap.forEach((circle, id) => {
    if (!currentIds.has(id)) { circle.remove(); this.circleMap.delete(id); }
  });
  readings.forEach(r => {
    if (this.circleMap.has(r.id)) {
      this.circleMap.get(r.id)!.setStyle({ color: r.color, fillColor: r.color });
    } else {
      this.circleMap.set(r.id, this.createCircle(r));
    }
  });
}
```

---

## Рівні шуму

| Рівень | Колір       |
|--------|-------------|
| LOW    | 🔵 синій    |
| MEDIUM | 🟡 жовтий   |
| HIGH   | 🔴 червоний |

---

## TODO

- [ ] **Emission mode 1** — вибір центру + потужність (dBm) → радіус зони придушення збільшується пропорційно потужності
- [ ] **Emission mode 2** — вибір центру + азимут + кут розкриву + потужність → секторна діаграма на карті
- [ ] **Cell selection mode** — клік по H3-ячейці для вибору зони покриття певної частоти

## Можливі розширення

- [ ] Імпорт точок з CSV/GeoJSON
- [ ] Фільтрація по частоті або рівню
- [ ] WebSocket для real-time оновлень з БПЛА
- [ ] Heatmap-шар через `Leaflet.heat`
- [ ] Авторизація і серверне зберігання (NestJS / Supabase)
