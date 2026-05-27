import { Injectable, signal } from '@angular/core';
import { latLngToCell } from 'h3-js';
import { NoiseReading, NoiseLevel, getBand, getNoiseColor } from '../models/noise-reading.model';

const STORAGE_KEY = 'rnm_v3';
const H3_RESOLUTION = 5;

@Injectable({ providedIn: 'root' })
export class RadioNoiseService {
  private _readings = signal<NoiseReading[]>(this.loadFromStorage());
  readonly readings = this._readings.asReadonly();

  getSnapshot(): NoiseReading[] {
    return this._readings();
  }

  addReading(
    lat: number,
    lng: number,
    frequency: number,
    noiseLevel: NoiseLevel,
    notes?: string
  ): NoiseReading {
    const band = getBand(frequency);
    const color = getNoiseColor(noiseLevel);
    const reading: NoiseReading = {
      id: crypto.randomUUID(),
      lat, lng,
      h3Index: latLngToCell(lat, lng, H3_RESOLUTION),
      frequency,
      noiseLevel,
      band,
      notes,
      timestamp: new Date(),
      color
    };
    this._readings.update(list => {
      const updated = [...list, reading];
      this.saveToStorage(updated);
      return updated;
    });
    return reading;
  }

  updateReading(
    id: string,
    frequency: number,
    noiseLevel: NoiseLevel,
    notes?: string
  ): void {
    this._readings.update(list => {
      const updated = list.map(r =>
        r.id === id
          ? {
              ...r,
              frequency,
              noiseLevel,
              band: getBand(frequency),
              color: getNoiseColor(noiseLevel),
              notes,
              timestamp: new Date()
            }
          : r
      );
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
      return parsed.map(r => ({
        ...r,
        timestamp: new Date(r.timestamp),
        h3Index: r.h3Index ?? latLngToCell(r.lat, r.lng, H3_RESOLUTION)
      }));
    } catch (_) {
      return [];
    }
  }
}
