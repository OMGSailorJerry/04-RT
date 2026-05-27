import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RadioNoiseService } from '../../services/radio-noise.service';

interface LegendItem {
  level: string;
  color: string;
  range: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { level: 'LOW',    color: '#3b82f6', range: '0–20%' },
  { level: 'MEDIUM', color: '#f59e0b', range: '20–60%' },
  { level: 'HIGH',   color: '#ef4444', range: '60–100%' }
];

@Component({
  selector: 'app-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './legend.component.html',
  styleUrl: './legend.component.css'
})
export class LegendComponent {
  private noiseService = inject(RadioNoiseService);

  readonly items: LegendItem[] = LEGEND_ITEMS;
  readonly totalReadings = computed(() => this.noiseService.readings().length);

  tagClass(level: string): string {
    return 'tag-' + level.toLowerCase();
  }
}
