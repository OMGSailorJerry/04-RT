import {
  Component, inject, computed, effect, signal, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { EmissionType, getBand } from '../../models/noise-reading.model';
import { generateCells, powerToK, powerToNoiseLevel } from '../../utils/cell-generator';

@Component({
  selector: 'app-emission-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './emission-form.component.html',
  styleUrl: './emission-form.component.css'
})
export class EmissionFormComponent {
  private noiseService = inject(RadioNoiseService);
  readonly uiState     = inject(UiStateService);
  private fb           = inject(FormBuilder);

  readonly formMode   = computed(() => this.uiState.formMode());
  readonly isActive   = computed(() => this.uiState.formMode() !== null);
  readonly hasPending = computed(() => !!this.uiState.mapPending());

  readonly editingReading = computed(() => {
    const id = this.uiState.editingId();
    if (!id) return null;
    return this.noiseService.readings().find(r => r.id === id) ?? null;
  });

  readonly presets = [433, 700, 868, 900, 1200, 1227, 1575, 2400, 3100, 3300, 5800, 8500];
  readonly selectedPreset = signal<number | null>(null);

  readonly emissionType = signal<EmissionType>('radial');
  readonly power        = signal<number>(30);
  readonly azimuth      = signal<number>(180);
  readonly beamAngle    = signal<number>(60);

  readonly powerK         = computed(() => powerToK(this.power()));
  readonly noiseLevel     = computed(() => powerToNoiseLevel(this.power()));
  readonly noiseLevelClass = computed(() => 'tag-' + this.noiseLevel().toLowerCase());

  readonly computedBand = computed(() => {
    const freq = this.form.get('frequency')?.value;
    return freq ? getBand(Number(freq)) : '—';
  });

  form = this.fb.group({
    frequency: [null as number | null, [Validators.required, Validators.min(1), Validators.max(30000)]],
    notes: ['']
  });

  constructor() {
    effect(() => {
      const editing = this.editingReading();
      const mode    = this.uiState.formMode();
      if (mode === 'edit' && editing) {
        this.form.patchValue({ frequency: editing.frequency, notes: editing.notes ?? '' });
        this.emissionType.set(editing.emissionType);
        this.power.set(editing.power);
        if (editing.azimuth   !== undefined) this.azimuth.set(editing.azimuth);
        if (editing.beamAngle !== undefined) this.beamAngle.set(editing.beamAngle);
      } else if (mode === 'add') {
        this.form.reset({ frequency: null, notes: '' });
        this.selectedPreset.set(null);
        this.emissionType.set('radial');
        this.power.set(30);
        this.azimuth.set(180);
        this.beamAngle.set(60);
      }
    });

    effect(() => {
      const mode    = this.uiState.formMode();
      const pending = this.uiState.mapPending();
      const editing = this.editingReading();
      if (mode === 'add' && pending) {
        this.uiState.setPreviewCells(
          generateCells(pending.lat, pending.lng, this.emissionType(), this.power(), this.azimuth(), this.beamAngle())
        );
      } else if (mode === 'edit' && editing) {
        this.uiState.setPreviewCells(
          generateCells(editing.lat, editing.lng, this.emissionType(), this.power(), this.azimuth(), this.beamAngle())
        );
      } else {
        this.uiState.setPreviewCells([]);
      }
    });
  }

  get headerLabel(): string {
    return this.uiState.formMode() === 'edit' ? 'EDIT EMISSION' : 'ADD EMISSION';
  }

  setType(type: EmissionType): void { this.emissionType.set(type); }
  setPreset(freq: number): void     { this.selectedPreset.set(freq); this.form.patchValue({ frequency: freq }); }
  setPower(e: Event): void          { this.power.set(+(e.target as HTMLInputElement).value); }
  setAzimuth(e: Event): void        { this.azimuth.set(+(e.target as HTMLInputElement).value); }
  setBeamAngle(e: Event): void      { this.beamAngle.set(+(e.target as HTMLInputElement).value); }

  confirm(): void {
    if (this.form.invalid) return;
    const { frequency, notes } = this.form.value;
    const mode      = this.uiState.formMode();
    const type      = this.emissionType();
    const level     = this.noiseLevel();
    const isSector  = type === 'sector';

    if (mode === 'edit') {
      const id      = this.uiState.editingId();
      const editing = this.editingReading();
      if (id && editing) {
        this.noiseService.updateReading(id, {
          cells:        generateCells(editing.lat, editing.lng, type, this.power(), this.azimuth(), this.beamAngle()),
          emissionType: type,
          frequency:    frequency!,
          noiseLevel:   level,
          power:        this.power(),
          azimuth:      isSector ? this.azimuth()    : undefined,
          beamAngle:    isSector ? this.beamAngle()  : undefined,
          notes:        notes || undefined
        });
      }
    } else if (mode === 'add') {
      const pending = this.uiState.mapPending();
      if (pending) {
        this.noiseService.addReading({
          lat:          pending.lat,
          lng:          pending.lng,
          cells:        generateCells(pending.lat, pending.lng, type, this.power(), this.azimuth(), this.beamAngle()),
          emissionType: type,
          frequency:    frequency!,
          noiseLevel:   level,
          power:        this.power(),
          azimuth:      isSector ? this.azimuth()   : undefined,
          beamAngle:    isSector ? this.beamAngle()  : undefined,
          notes:        notes || undefined
        });
      }
    }
    this.uiState.closeForm();
  }

  cancel(): void { this.uiState.closeForm(); }
}
