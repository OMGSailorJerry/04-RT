import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MapComponent } from './components/map/map.component';
import { FrequencyListComponent } from './components/frequency-list/frequency-list.component';
import { EmissionFormComponent } from './components/emission-form/emission-form.component';
import { FrequencyDetailComponent } from './components/frequency-detail/frequency-detail.component';
import { RadioNoiseService } from './services/radio-noise.service';
import { UiStateService } from './services/ui-state.service';
import { NoiseReading, EnemyAsset } from './models/noise-reading.model';

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

  exportGeoJson(): void {
    const readings = this.noiseService.getSnapshot();
    const enemies  = this.noiseService.getEnemySnapshot();
    if (!readings.length && !enemies.length) return;

    const friendlyFeatures = readings.map((r: NoiseReading) => {
      const d = 0.005;
      const box = [
        [r.lng - d, r.lat - d],
        [r.lng + d, r.lat - d],
        [r.lng + d, r.lat + d],
        [r.lng - d, r.lat + d],
        [r.lng - d, r.lat - d]
      ];
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
          fill: 'blue'
        },
        geometry: { type: 'Polygon', coordinates: [box] }
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

  exportCsv(): void {
    const readings = this.noiseService.getSnapshot();
    if (!readings.length) return;

    const header = 'Frequency (MHz),Band,Noise Level,Notes,Lat,Lng,Timestamp';
    const rows = readings.map((r: NoiseReading) =>
      [
        r.frequency,
        r.band,
        r.noiseLevel,
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
        r.lat.toFixed(5),
        r.lng.toFixed(5),
        r.timestamp.toISOString()
      ].join(',')
    );

    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `radio-noise-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
