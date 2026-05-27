import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseReading } from '../../models/noise-reading.model';

@Component({
  selector: 'app-frequency-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './frequency-table.component.html',
  styleUrl: './frequency-table.component.css'
})
export class FrequencyTableComponent {
  private noiseService = inject(RadioNoiseService);
  readonly uiState = inject(UiStateService);

  readonly readings = computed(() => this.noiseService.readings());

  tagClass(r: NoiseReading): string {
    return 'tag-' + r.noiseLevel.toLowerCase();
  }

  rowClass(r: NoiseReading): string {
    const selected = this.uiState.selectedId() === r.id ? ' row-selected' : '';
    const high = r.noiseLevel === 'HIGH' ? ' row-high' : '';
    return selected + high;
  }

  select(r: NoiseReading): void {
    this.uiState.select(r.id);
  }

  edit(r: NoiseReading, event: Event): void {
    event.stopPropagation();
    this.uiState.select(r.id);
  }

  remove(r: NoiseReading, event: Event): void {
    event.stopPropagation();
    this.noiseService.removeReading(r.id);
    if (this.uiState.selectedId() === r.id) {
      this.uiState.closeForm();
    }
  }
}
