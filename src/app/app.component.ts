import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MapComponent } from './components/map/map.component';
import { FrequencyListComponent } from './components/frequency-list/frequency-list.component';
import { EmissionFormComponent } from './components/emission-form/emission-form.component';
import { FrequencyDetailComponent } from './components/frequency-detail/frequency-detail.component';
import { RadioNoiseService } from './services/radio-noise.service';
import { UiStateService } from './services/ui-state.service';
import { NoiseReading } from './models/noise-reading.model';

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
  readonly currentTime = signal(this.formatTime());

  constructor() {
    setInterval(() => this.currentTime.set(this.formatTime()), 1000);
  }

  private formatTime(): string {
    return new Date().toLocaleTimeString('uk-UA', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
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

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radio-noise-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
