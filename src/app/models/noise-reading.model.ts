export type NoiseLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Band = 'UHF' | 'L-BAND' | 'S-BAND' | 'C-BAND' | 'X-BAND';
export type EmissionType = 'radial' | 'sector';

export interface NoiseReading {
  id: string;
  lat: number;
  lng: number;
  cells: string[];
  emissionType: EmissionType;
  frequency: number;
  noiseLevel: NoiseLevel;
  band: Band;
  power: number;        // 1–100 abstract power units
  azimuth?: number;     // 0–359°, sector only
  beamAngle?: number;   // 5–180°, sector only
  notes?: string;
  timestamp: Date;
  color: string;
}

export const NOISE_COLORS: Record<NoiseLevel, string> = {
  LOW:      '#4FAFCB',
  MEDIUM:   '#D8A247',
  HIGH:     '#F05A28',
  CRITICAL: '#E53535'
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
