import { Injectable, signal } from '@angular/core';
import { NoiseReading, NoiseLevel, EmissionType, getBand, getNoiseColor, EnemyAsset, EW_NAMES, randomEwFreqs } from '../models/noise-reading.model';
import { latLngToCell, cellToLatLng } from 'h3-js';
import { H3_RES, powerToNoiseLevel } from '../utils/cell-generator';

const STORAGE_KEY       = 'rnm_v6';
const ENEMY_STORAGE_KEY = 'rnm_enemy_v1';

export interface AddReadingOpts {
  lat: number;
  lng: number;
  cells: string[];
  emissionType: EmissionType;
  frequency: number;
  bandwidth: number;
  noiseLevel: NoiseLevel;
  power: number;
  azimuth?: number;
  beamAngle?: number;
  notes?: string;
}

export interface UpdateReadingOpts {
  cells: string[];
  emissionType: EmissionType;
  frequency: number;
  bandwidth: number;
  noiseLevel: NoiseLevel;
  power: number;
  azimuth?: number;
  beamAngle?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class RadioNoiseService {
  private _readings    = signal<NoiseReading[]>(this.loadFromStorage());
  private _enemyAssets = signal<EnemyAsset[]>(this.loadEnemyFromStorage());

  readonly readings    = this._readings.asReadonly();
  readonly enemyAssets = this._enemyAssets.asReadonly();

  getSnapshot(): NoiseReading[] { return this._readings(); }
  getEnemySnapshot(): EnemyAsset[] { return this._enemyAssets(); }

  addReading(opts: AddReadingOpts): NoiseReading {
    const reading: NoiseReading = {
      id: crypto.randomUUID(),
      lat: opts.lat,
      lng: opts.lng,
      cells: opts.cells,
      emissionType: opts.emissionType,
      frequency: opts.frequency,
      bandwidth: opts.bandwidth,
      noiseLevel: opts.noiseLevel,
      band: getBand(opts.frequency),
      power: opts.power,
      azimuth: opts.azimuth,
      beamAngle: opts.beamAngle,
      notes: opts.notes,
      timestamp: new Date(),
      color: getNoiseColor(opts.noiseLevel)
    };
    this._readings.update(list => {
      const updated = [...list, reading];
      this.saveToStorage(updated);
      return updated;
    });
    return reading;
  }

  updateReading(id: string, opts: UpdateReadingOpts): void {
    this._readings.update(list => {
      const updated = list.map(r =>
        r.id === id
          ? {
              ...r,
              cells: opts.cells,
              emissionType: opts.emissionType,
              frequency: opts.frequency,
              bandwidth: opts.bandwidth,
              noiseLevel: opts.noiseLevel,
              band: getBand(opts.frequency),
              power: opts.power,
              azimuth: opts.azimuth,
              beamAngle: opts.beamAngle,
              notes: opts.notes,
              color: getNoiseColor(opts.noiseLevel),
              timestamp: new Date()
            }
          : r
      );
      this.saveToStorage(updated);
      return updated;
    });
  }

  updateCells(id: string, cells: string[]): void {
    this._readings.update(list => {
      const updated = list.map(r => r.id === id ? { ...r, cells } : r);
      this.saveToStorage(updated);
      return updated;
    });
  }

  removeReading(id: string): void {
    this._readings.update(list => {
      const updated = list.filter(r => r.id !== id);
      this.saveToStorage(updated);
      return updated;
    });
  }

  clearAll(): void {
    this._readings.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  addEnemyAsset(lat: number, lng: number): EnemyAsset {
    const asset: EnemyAsset = {
      id: crypto.randomUUID(),
      lat,
      lng,
      h3Index: latLngToCell(lat, lng, H3_RES),
      frequencies: randomEwFreqs(),
      timestamp: new Date(),
      ew_name: EW_NAMES[Math.floor(Math.random() * EW_NAMES.length)]
    };
    this._enemyAssets.update(list => {
      const updated = [...list, asset];
      this.saveEnemyToStorage(updated);
      return updated;
    });
    return asset;
  }

  removeEnemyAsset(id: string): void {
    this._enemyAssets.update(list => {
      const updated = list.filter(a => a.id !== id);
      this.saveEnemyToStorage(updated);
      return updated;
    });
  }

  clearAllEnemy(): void {
    this._enemyAssets.set([]);
    localStorage.removeItem(ENEMY_STORAGE_KEY);
  }

  importFromGeoJson(geojson: { features?: any[] }): void {
    const features = geojson?.features ?? [];
    const readings: NoiseReading[] = [];
    const enemies: EnemyAsset[]   = [];

    for (const f of features) {
      const props = f?.properties ?? {};
      if (props.affiliation === 'friendly') {
        const freqRange    = props.frequencies?.[0];
        const frequency    = props._frequency   ?? (freqRange ? Math.round((freqRange.from + freqRange.to) / 2) : 900);
        const bandwidth    = props._bandwidth   ?? (freqRange ? Math.round(freqRange.to - freqRange.from) : 50);
        const power        = props._power       ?? 50;
        const noiseLevel   = props._noiseLevel  ?? powerToNoiseLevel(power);
        const emissionType = props._emissionType ?? 'radial';
        const h3Index      = props.h3Index ?? '';
        const cells        = props._cells?.length ? props._cells : (h3Index ? [h3Index] : []);
        const [lat, lng]   = h3Index ? cellToLatLng(h3Index) : [0, 0];
        readings.push({
          id:           props.zone_id ?? crypto.randomUUID(),
          lat, lng,
          cells,
          emissionType,
          frequency,
          bandwidth,
          noiseLevel,
          band:         getBand(frequency),
          power,
          azimuth:      props._azimuth,
          beamAngle:    props._beamAngle,
          notes:        props._notes,
          timestamp:    new Date(props.updated_at ?? Date.now()),
          color:        getNoiseColor(noiseLevel)
        });
      } else if (props.affiliation === 'enemy') {
        const pos = props.position ?? [0, 0];
        enemies.push({
          id:          props.zone_id ?? crypto.randomUUID(),
          lat:         pos[1],
          lng:         pos[0],
          h3Index:     props.h3Index ?? latLngToCell(pos[1], pos[0], H3_RES),
          frequencies: props.frequencies ?? [],
          timestamp:   new Date(props.updated_at ?? Date.now()),
          ew_name:     props.ew_name ?? 'Unknown'
        });
      }
    }

    this._readings.set(readings);
    this.saveToStorage(readings);
    this._enemyAssets.set(enemies);
    this.saveEnemyToStorage(enemies);
  }

  private saveToStorage(readings: NoiseReading[]): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(readings)); } catch (_) {}
  }

  private loadFromStorage(): NoiseReading[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as NoiseReading[];
      return parsed.map(r => ({ ...r, bandwidth: r.bandwidth ?? 50, timestamp: new Date(r.timestamp) }));
    } catch (_) { return []; }
  }

  private saveEnemyToStorage(assets: EnemyAsset[]): void {
    try { localStorage.setItem(ENEMY_STORAGE_KEY, JSON.stringify(assets)); } catch (_) {}
  }

  private loadEnemyFromStorage(): EnemyAsset[] {
    try {
      const raw = localStorage.getItem(ENEMY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as EnemyAsset[];
      return parsed.map(a => ({ ...a, timestamp: new Date(a.timestamp) }));
    } catch (_) { return []; }
  }
}
