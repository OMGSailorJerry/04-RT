import { Component, inject, computed, signal, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseReading, EnemyAsset } from '../../models/noise-reading.model';

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

  readonly readings     = computed(() => this.noiseService.readings());
  readonly enemyAssets  = computed(() => this.noiseService.enemyAssets());
  readonly count        = computed(() => this.readings().length);
  readonly menuOpenId      = signal<string | null>(null);
  readonly menuOpenEnemyId = signal<string | null>(null);

  @HostListener('document:click')
  closeMenu(): void {
    this.menuOpenId.set(null);
    this.menuOpenEnemyId.set(null);
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
    this.uiState.startAdd();
  }

  isEnemySelected(a: EnemyAsset): boolean {
    return this.uiState.selectedEnemyId() === a.id;
  }

  selectEnemy(a: EnemyAsset): void {
    this.uiState.selectEnemy(a.id);
  }

  toggleEnemyMenu(a: EnemyAsset, event: Event): void {
    event.stopPropagation();
    this.menuOpenEnemyId.set(this.menuOpenEnemyId() === a.id ? null : a.id);
  }

  deleteEnemy(a: EnemyAsset, event: Event): void {
    event.stopPropagation();
    this.menuOpenEnemyId.set(null);
    this.noiseService.removeEnemyAsset(a.id);
  }

  formatFreqs(a: EnemyAsset): string {
    return a.frequencies.map(f => `${f.from}–${f.to}`).join(', ') + ' MHz';
  }
}
