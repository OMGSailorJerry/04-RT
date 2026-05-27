// src/app/models/noise-reading.model.ts

export type NoiseLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Band = 'UHF' | 'L-BAND' | 'S-BAND' | 'C-BAND' | 'X-BAND';

export interface NoiseReading {
  id: string;
  lat: number;
  lng: number;
  h3Index: string;
  frequency: number;       // MHz, required
  noiseLevel: NoiseLevel;
  band: Band;
  notes?: string;
  timestamp: Date;
  color: string;           // computed from noiseLevel
}

export const NOISE_COLORS: Record<NoiseLevel, string> = {
  LOW:    '#3b82f6',
  MEDIUM: '#f59e0b',
  HIGH:   '#ef4444'
};

export const NOISE_LABEL: Record<NoiseLevel, string> = {
  LOW:    'LOW',
  MEDIUM: 'MEDIUM',
  HIGH:   'HIGH'
};

export function getBand(mhz: number): Band {
  if (mhz < 1000) return 'UHF';
  if (mhz < 2000) return 'L-BAND';
  if (mhz < 4000) return 'S-BAND';
  if (mhz < 8000) return 'C-BAND';
  return 'X-BAND';
}

export function getNoiseColor(level: NoiseLevel): string {
  return NOISE_COLORS[level];
}
