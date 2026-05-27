import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseReading } from '../../models/noise-reading.model';

@Component({
  selector: 'app-frequency-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './frequency-detail.component.html',
  styleUrl: './frequency-detail.component.css'
})
export class FrequencyDetailComponent {
  private noiseService = inject(RadioNoiseService);
  readonly uiState = inject(UiStateService);

  readonly selected = computed<NoiseReading | null>(() => {
    const id = this.uiState.selectedId();
    if (!id) return null;
    return this.noiseService.readings().find(r => r.id === id) ?? null;
  });

  tagClass(r: NoiseReading): string {
    return 'tag-' + r.noiseLevel.toLowerCase();
  }

  fillClass(r: NoiseReading): string {
    return 'fill-' + r.noiseLevel.toLowerCase();
  }
}
