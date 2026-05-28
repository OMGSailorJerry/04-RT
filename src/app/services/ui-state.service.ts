import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly selectedId   = signal<string | null>(null);
  readonly editingId    = signal<string | null>(null);
  readonly mapPending   = signal<{ lat: number; lng: number } | null>(null);
  readonly formMode     = signal<'add' | 'edit' | null>(null);
  readonly previewCells = signal<string[]>([]);
  readonly cellEditId   = signal<string | null>(null);

  select(id: string): void {
    this.selectedId.set(id);
    this.editingId.set(null);
    this.formMode.set(null);
    this.cellEditId.set(null);
  }

  startEdit(id: string): void {
    this.selectedId.set(id);
    this.editingId.set(id);
    this.formMode.set('edit');
    this.cellEditId.set(null);
  }

  startAdd(): void {
    this.selectedId.set(null);
    this.editingId.set(null);
    this.mapPending.set(null);
    this.formMode.set('add');
    this.cellEditId.set(null);
  }

  updatePending(lat: number, lng: number): void {
    this.mapPending.set({ lat, lng });
  }

  setPreviewCells(cells: string[]): void {
    this.previewCells.set(cells);
  }

  startCellEdit(id: string): void {
    this.selectedId.set(id);
    this.editingId.set(null);
    this.formMode.set(null);
    this.mapPending.set(null);
    this.previewCells.set([]);
    this.cellEditId.set(id);
  }

  stopCellEdit(): void {
    this.cellEditId.set(null);
  }

  deselect(): void {
    this.selectedId.set(null);
    this.editingId.set(null);
    this.formMode.set(null);
    this.mapPending.set(null);
    this.previewCells.set([]);
    this.cellEditId.set(null);
  }

  closeForm(): void {
    this.formMode.set(null);
    this.editingId.set(null);
    this.mapPending.set(null);
    this.previewCells.set([]);
  }
}
