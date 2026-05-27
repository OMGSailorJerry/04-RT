import {
  Component, inject, computed, effect, signal, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseLevel, getBand } from '../../models/noise-reading.model';

@Component({
  selector: 'app-emission-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './emission-form.component.html',
  styleUrl: './emission-form.component.css'
})
export class EmissionFormComponent {
  private noiseService = inject(RadioNoiseService);
  readonly uiState = inject(UiStateService);
  private fb = inject(FormBuilder);

  readonly formMode = computed(() => this.uiState.formMode());
  readonly isActive = computed(() => this.uiState.formMode() !== null);

  readonly editingReading = computed(() => {
    const id = this.uiState.editingId();
    if (!id) return null;
    return this.noiseService.readings().find(r => r.id === id) ?? null;
  });

  readonly presets = [433, 700, 868, 900, 1200, 1227, 1575, 2400, 3100, 3300, 5800, 8500];
  readonly selectedPreset = signal<number | null>(null);

  readonly computedBand = computed(() => {
    const freq = this.form.get('frequency')?.value;
    return freq ? getBand(Number(freq)) : '—';
  });

  form = this.fb.group({
    frequency: [null as number | null, [Validators.required, Validators.min(1), Validators.max(30000)]],
    noiseLevel: ['LOW' as NoiseLevel, Validators.required],
    notes: ['']
  });

  constructor() {
    effect(() => {
      const editing = this.editingReading();
      const mode = this.uiState.formMode();
      if (mode === 'edit' && editing) {
        this.form.patchValue({
          frequency: editing.frequency,
          noiseLevel: editing.noiseLevel,
          notes: editing.notes ?? ''
        });
      } else if (mode === 'add') {
        this.form.reset({ frequency: null, noiseLevel: 'LOW', notes: '' });
        this.selectedPreset.set(null);
      }
    });
  }

  get headerLabel(): string {
    return this.uiState.formMode() === 'edit' ? 'EDIT EMISSION' : 'ADD EMISSION';
  }

  confirm(): void {
    if (this.form.invalid) return;
    const { frequency, noiseLevel, notes } = this.form.value;
    const mode = this.uiState.formMode();
    if (mode === 'edit') {
      const id = this.uiState.editingId();
      if (id) {
        this.noiseService.updateReading(
          id,
          frequency!,
          noiseLevel as NoiseLevel,
          notes || undefined
        );
      }
    } else if (mode === 'add') {
      const pending = this.uiState.mapPending();
      if (pending) {
        this.noiseService.addReading(
          pending.lat,
          pending.lng,
          frequency!,
          noiseLevel as NoiseLevel,
          notes || undefined
        );
      }
    }
    this.uiState.closeForm();
  }

  setPreset(freq: number): void {
    this.selectedPreset.set(freq);
    this.form.patchValue({ frequency: freq });
  }

  cancel(): void {
    this.uiState.closeForm();
  }
}
