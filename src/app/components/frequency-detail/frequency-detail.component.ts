import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseReading } from '../../models/noise-reading.model';
import { powerToK } from '../../utils/cell-generator';

@Component({
  selector: 'app-frequency-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, UpperCasePipe],
  templateUrl: './frequency-detail.component.html',
  styleUrl: './frequency-detail.component.css'
})
export class FrequencyDetailComponent {
  private noiseService = inject(RadioNoiseService);
  private uiState      = inject(UiStateService);

  readonly selected = computed<NoiseReading | null>(() => {
    const id = this.uiState.selectedId();
    if (!id) return null;
    return this.noiseService.readings().find(r => r.id === id) ?? null;
  });

  readonly isCellEdit = computed(() => !!this.uiState.cellEditId());

  tagClass(r: NoiseReading): string {
    return 'tag-' + r.noiseLevel.toLowerCase();
  }

  ringK(power: number): number {
    return powerToK(power);
  }

  startCellEdit(r: NoiseReading): void {
    this.uiState.startCellEdit(r.id);
  }

  stopCellEdit(): void {
    this.uiState.stopCellEdit();
  }
}
