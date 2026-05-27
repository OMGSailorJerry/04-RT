import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly selectedId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly mapPending = signal<{ lat: number; lng: number } | null>(null);
  readonly formMode = signal<'add' | 'edit' | null>(null);

  select(id: string): void {
    this.selectedId.set(id);
    this.editingId.set(null);
    this.formMode.set(null);
  }

  startEdit(id: string): void {
    this.selectedId.set(id);
    this.editingId.set(id);
    this.formMode.set('edit');
  }

  startAdd(lat: number, lng: number): void {
    this.selectedId.set(null);
    this.editingId.set(null);
    this.mapPending.set({ lat, lng });
    this.formMode.set('add');
  }

  updatePending(lat: number, lng: number): void {
    this.mapPending.set({ lat, lng });
  }

  deselect(): void {
    this.selectedId.set(null);
    this.editingId.set(null);
    this.formMode.set(null);
    this.mapPending.set(null);
  }

  closeForm(): void {
    this.formMode.set(null);
    this.editingId.set(null);
    this.mapPending.set(null);
  }
}
