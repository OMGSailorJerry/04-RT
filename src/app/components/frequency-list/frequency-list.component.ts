import { Component, inject, computed, signal, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseReading } from '../../models/noise-reading.model';

@Component({
  selector: 'app-frequency-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './frequency-list.component.html',
  styleUrl: './frequency-list.component.css'
})
export class FrequencyListComponent {
  private noiseService = inject(RadioNoiseService);
  readonly uiState = inject(UiStateService);

  readonly readings = computed(() => this.noiseService.readings());
  readonly count = computed(() => this.readings().length);
  readonly menuOpenId = signal<string | null>(null);

  @HostListener('document:click')
  closeMenu(): void {
    this.menuOpenId.set(null);
  }

  tagClass(r: NoiseReading): string {
    return 'tag-' + r.noiseLevel.toLowerCase();
  }

  isSelected(r: NoiseReading): boolean {
    return this.uiState.selectedId() === r.id;
  }

  select(r: NoiseReading): void {
    this.uiState.select(r.id);
  }

  toggleMenu(r: NoiseReading, event: Event): void {
    event.stopPropagation();
    this.menuOpenId.set(this.menuOpenId() === r.id ? null : r.id);
  }

  edit(r: NoiseReading, event: Event): void {
    event.stopPropagation();
    this.menuOpenId.set(null);
    this.uiState.startEdit(r.id);
  }

  delete(r: NoiseReading, event: Event): void {
    event.stopPropagation();
    this.menuOpenId.set(null);
    this.noiseService.removeReading(r.id);
  }

  addEmission(): void {
    this.uiState.startAdd(48.5, 32.0);
  }
}
