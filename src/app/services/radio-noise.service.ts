import { Injectable, signal } from '@angular/core';
import { NoiseReading, NoiseLevel, EmissionType, getBand, getNoiseColor } from '../models/noise-reading.model';

const STORAGE_KEY = 'rnm_v5';

export interface AddReadingOpts {
  lat: number;
  lng: number;
  cells: string[];
  emissionType: EmissionType;
  frequency: number;
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
  noiseLevel: NoiseLevel;
  power: number;
  azimuth?: number;
  beamAngle?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class RadioNoiseService {
  private _readings = signal<NoiseReading[]>(this.loadFromStorage());
  readonly readings = this._readings.asReadonly();

  getSnapshot(): NoiseReading[] {
    return this._readings();
  }

  addReading(opts: AddReadingOpts): NoiseReading {
    const reading: NoiseReading = {
      id: crypto.randomUUID(),
      lat: opts.lat,
      lng: opts.lng,
      cells: opts.cells,
      emissionType: opts.emissionType,
      frequency: opts.frequency,
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

  private saveToStorage(readings: NoiseReading[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
    } catch (_) {}
  }

  private loadFromStorage(): NoiseReading[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as NoiseReading[];
      return parsed.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
    } catch (_) {
      return [];
    }
  }
}
