import { latLngToCell, gridDisk, polygonToCells } from 'h3-js';
import { EmissionType, NoiseLevel } from '../models/noise-reading.model';

export const H3_RES = 7;
const EARTH_R_KM = 6371;
const EDGE_KM = 1.41; // avg edge length at resolution 7

export function powerToNoiseLevel(power: number): NoiseLevel {
  if (power <= 25) return 'LOW';
  if (power <= 50) return 'MEDIUM';
  if (power <= 75) return 'HIGH';
  return 'CRITICAL';
}

// At res 7 (edge ~1.4km): power 1→k=2(~3km), 50→k=10(~14km), 100→k=20(~28km)
export function powerToK(power: number): number {
  return Math.max(2, Math.min(20, Math.round(power / 5)));
}

export function powerToRangeKm(power: number): number {
  return powerToK(power) * EDGE_KM;
}

export function generateCells(
  lat: number, lng: number,
  type: EmissionType,
  power: number,
  azimuth = 0,
  beamAngle = 60
): string[] {
  if (type === 'sector') {
    return generateSectorCells(lat, lng, power, azimuth, beamAngle);
  }
  return generateRadialCells(lat, lng, power);
}

function generateRadialCells(lat: number, lng: number, power: number): string[] {
  const center = latLngToCell(lat, lng, H3_RES);
  return gridDisk(center, powerToK(power));
}

function generateSectorCells(
  lat: number, lng: number,
  power: number, azimuth: number, beamAngle: number
): string[] {
  const baseKm  = powerToRangeKm(power);
  const gain    = Math.sqrt(360 / Math.max(beamAngle, 5));
  const rangeKm = baseKm * gain;
  const coords  = buildSectorCoords(lat, lng, rangeKm, azimuth, beamAngle);
  const cells = polygonToCells([coords], H3_RES);
  const center = latLngToCell(lat, lng, H3_RES);
  if (!cells.includes(center)) cells.push(center);
  return cells.length > 0 ? cells : [center];
}

// Sector polygon via haversine destination point formula
function buildSectorCoords(
  lat: number, lng: number,
  rangeKm: number, azimuth: number, beamAngle: number
): [number, number][] {
  const d = rangeKm / EARTH_R_KM;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const half = beamAngle / 2;
  const steps = 32;

  const coords: [number, number][] = [[lat, lng]];
  for (let i = 0; i <= steps; i++) {
    const az = (azimuth - half + beamAngle * (i / steps)) * Math.PI / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(az)
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(az) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
    coords.push([lat2 * 180 / Math.PI, lng2 * 180 / Math.PI]);
  }
  coords.push([lat, lng]);
  return coords;
}
