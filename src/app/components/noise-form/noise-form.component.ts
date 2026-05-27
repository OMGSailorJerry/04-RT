import {
  Component, inject, input, output, effect, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { NoiseReading, NOISE_TIERS, getNoiseTier } from '../../models/noise-reading.model';

export interface FormSubmitEvent {
  noiseLevel: number;
  frequency?: number;
  label?: string;
}

@Component({
  selector: 'app-noise-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './noise-form.component.html',
  styleUrl: './noise-form.component.css'
})
export class NoiseFormComponent {
  readonly visible = input(false);
  readonly lat = input(0);
  readonly lng = input(0);
  readonly editReading = input<NoiseReading | null>(null);

  readonly submitted = output<FormSubmitEvent>();
  readonly cancelled = output<void>();
  readonly deleted = output<void>();

  private fb = inject(FormBuilder);
  readonly tiers = NOISE_TIERS;

  form = this.fb.group({
    noiseLevel: [-85, [Validators.required, Validators.min(-130), Validators.max(0)]],
    frequency: [null as number | null, [Validators.min(1), Validators.max(6000)]],
    label: ['', Validators.maxLength(40)]
  });

  constructor() {
    effect(() => {
      const editing = this.editReading();
      if (editing) {
        this.form.patchValue({
          noiseLevel: editing.noiseLevel,
          frequency: editing.frequency ?? null,
          label: editing.label ?? ''
        });
      } else if (this.visible()) {
        this.form.reset({ noiseLevel: -85, frequency: null, label: '' });
      }
    });
  }

  get currentTier() {
    return getNoiseTier(this.form.value.noiseLevel ?? -85);
  }

  get noiseLevelValue(): number {
    return this.form.value.noiseLevel ?? -85;
  }

  submit(): void {
    if (this.form.invalid) return;
    const { noiseLevel, frequency, label } = this.form.value;
    this.submitted.emit({
      noiseLevel: noiseLevel!,
      frequency: frequency ?? undefined,
      label: label || undefined
    });
    this.form.reset({ noiseLevel: -85, frequency: null, label: '' });
  }

  cancel(): void {
    this.cancelled.emit();
    this.form.reset({ noiseLevel: -85, frequency: null, label: '' });
  }

  delete(): void {
    this.deleted.emit();
  }
}
