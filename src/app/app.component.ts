import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MapComponent } from './components/map/map.component';
import { FrequencyListComponent } from './components/frequency-list/frequency-list.component';
import { EmissionFormComponent } from './components/emission-form/emission-form.component';
import { FrequencyDetailComponent } from './components/frequency-detail/frequency-detail.component';
import { RadioNoiseService } from './services/radio-noise.service';
import { UiStateService } from './services/ui-state.service';
import { NoiseReading, EnemyAsset } from './models/noise-reading.model';
import { cellsToMultiPolygon } from 'h3-js';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MapComponent,
    FrequencyListComponent,
    EmissionFormComponent,
    FrequencyDetailComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private noiseService = inject(RadioNoiseService);
  readonly uiState = inject(UiStateService);
  readonly currentTime      = signal(this.formatTime());
  readonly sidebarCollapsed = signal(false);

  constructor() {
    setInterval(() => this.currentTime.set(this.formatTime()), 1000);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  private formatTime(): string {
    return new Date().toLocaleTimeString('uk-UA', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  importGeoJson(): void {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const geojson = JSON.parse(ev.target?.result as string);
          this.noiseService.importFromGeoJson(geojson);
          this.uiState.deselect();
        } catch (_) {}
      };
      reader.readAsText(file, 'utf-8');
    };
    input.click();
  }

  exportGeoJson(): void {
    const readings = this.noiseService.getSnapshot();
    const enemies  = this.noiseService.getEnemySnapshot();
    if (!readings.length && !enemies.length) return;

    const friendlyFeatures = readings.map((r: NoiseReading) => {
      const polys    = cellsToMultiPolygon(r.cells, true);
      const geometry = polys.length === 1
        ? { type: 'Polygon',      coordinates: polys[0] }
        : { type: 'MultiPolygon', coordinates: polys };
      return {
        type: 'Feature',
        properties: {
          affiliation: 'friendly',
          frequencies: [{ from: r.frequency - 50, to: r.frequency + 50 }],
          type: 'ecm_active',
          updated_at: r.timestamp.toISOString(),
          name: r.id,
          zone_id: r.id,
          h3Index: r.cells[0] ?? '',
          fill: 'blue',
          // round-trip fields (ignored by Ocheret)
          _frequency:    r.frequency,
          _power:        r.power,
          _noiseLevel:   r.noiseLevel,
          _emissionType: r.emissionType,
          _cells:        r.cells,
          ...(r.azimuth   != null ? { _azimuth:   r.azimuth   } : {}),
          ...(r.beamAngle != null ? { _beamAngle: r.beamAngle } : {}),
          ...(r.notes               ? { _notes:     r.notes     } : {})
        },
        geometry
      };
    });

    const enemyFeatures = enemies.map((a: EnemyAsset) => {
      const STEPS = 36;
      const R     = 0.03;
      const pts   = Array.from({ length: STEPS }, (_, i) => {
        const angle = (i / STEPS) * 2 * Math.PI;
        return [a.lng + R * Math.cos(angle), a.lat + R * Math.sin(angle)];
      });
      pts.push(pts[0]);
      return {
        type: 'Feature',
        properties: {
          affiliation: 'enemy',
          frequencies: a.frequencies,
          type: 'ecm_active',
          updated_at: a.timestamp.toISOString(),
          name: a.id,
          zone_id: a.id,
          h3Index: a.h3Index,
          position: [a.lng, a.lat],
          ew_name: a.ew_name,
          fill: '#f56b6b'
        },
        geometry: { type: 'Polygon', coordinates: [pts] }
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features: [...friendlyFeatures, ...enemyFeatures]
    };
    const encoded = new TextEncoder().encode(JSON.stringify(geojson, null, 2));
    const blob = new Blob([encoded], { type: 'application/json;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'mock_zones.json';
    a.click();
    URL.revokeObjectURL(url);
  }

}
