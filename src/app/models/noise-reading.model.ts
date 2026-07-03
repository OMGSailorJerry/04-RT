export type NoiseLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EnemyAsset {
  id: string;
  lat: number;
  lng: number;
  h3Index: string;
  frequencies: { from: number; to: number }[];
  timestamp: Date;
  ew_name: string;
}

export const EW_NAMES = [
  'Р-934У', 'Борисоглебськ-2', 'Красуха-4', 'Москва-1',
  'Хибіни', 'Леер-3', 'Репеллент', 'Мурманськ-БН'
];

export function randomEwFreqs(): { from: number; to: number }[] {
  const BANDS = [
    { base: 450,  bw: 100 },
    { base: 900,  bw: 150 },
    { base: 1200, bw: 200 },
    { base: 2400, bw: 300 },
    { base: 3500, bw: 200 },
  ];
  const count = 2 + Math.floor(Math.random() * 3);
  return [...BANDS]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(b => ({ from: b.base, to: b.base + b.bw }));
}
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
