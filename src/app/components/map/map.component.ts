import {
  Component, OnDestroy, AfterViewInit,
  inject, signal, effect, ChangeDetectionStrategy
} from '@angular/core';
import * as L from 'leaflet';
import { cellsToMultiPolygon, latLngToCell } from 'h3-js';

import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseReading } from '../../models/noise-reading.model';
import { H3_RES } from '../../utils/cell-generator';

interface HexMeta { color: string; cellsSig: string; }

@Component({
  selector: 'app-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `<div id="leaflet-map"></div>`,
  styleUrl: './map.component.css'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private noiseService = inject(RadioNoiseService);
  private uiState      = inject(UiStateService);

  private map!: L.Map;
  private hexMap          = new Map<string, L.LayerGroup>();
  private hexMeta         = new Map<string, HexMeta>();
  private pendingMarker:  L.Marker      | null = null;
  private previewGroup:   L.LayerGroup  | null = null;
  private hoverGroup:     L.LayerGroup  | null = null;
  private mapReady        = signal(false);

  constructor() {
    effect(() => { if (!this.mapReady()) return; this.syncHexagons(this.noiseService.readings()); });
    effect(() => { if (!this.mapReady()) return; this.syncPendingMarker(this.uiState.mapPending()); });
    effect(() => { if (!this.mapReady()) return; this.syncPreview(this.uiState.previewCells()); });
    effect(() => { if (!this.mapReady()) return; this.onCellEditChanged(this.uiState.cellEditId()); });
  }

  ngAfterViewInit(): void { this.initMap(); this.mapReady.set(true); }
  ngOnDestroy(): void { this.map?.remove(); }

  private initMap(): void {
    this.map = L.map('leaflet-map', { center: [48.5, 32.0], zoom: 6, zoomControl: false });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB', maxZoom: 19
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const editId = this.uiState.cellEditId();
      if (editId) {
        this.toggleCell(editId, e.latlng.lat, e.latlng.lng);
        return;
      }
      if (this.uiState.formMode() === 'add') {
        this.uiState.updatePending(e.latlng.lat, e.latlng.lng);
      } else {
        this.uiState.deselect();
      }
    });

    this.map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (this.uiState.cellEditId()) {
        this.showHoverCell(e.latlng.lat, e.latlng.lng);
      } else {
        this.clearHoverCell();
      }
    });

    this.map.on('mouseout', () => this.clearHoverCell());
  }

  // ── Cell edit mode ───────────────────────────────────

  private onCellEditChanged(id: string | null): void {
    const container = this.map.getContainer();
    container.style.cursor = id ? 'crosshair' : '';
    if (!id) this.clearHoverCell();
  }

  private toggleCell(editId: string, lat: number, lng: number): void {
    const cell    = latLngToCell(lat, lng, H3_RES);
    const reading = this.noiseService.readings().find(r => r.id === editId);
    if (!reading) return;
    const has      = reading.cells.includes(cell);
    const newCells = has
      ? reading.cells.filter(c => c !== cell)
      : [...reading.cells, cell];
    if (newCells.length === 0) return; // keep at least one cell
    this.noiseService.updateCells(editId, newCells);
  }

  private showHoverCell(lat: number, lng: number): void {
    const cell    = latLngToCell(lat, lng, H3_RES);
    const editId  = this.uiState.cellEditId();
    const reading = this.noiseService.readings().find(r => r.id === editId);
    const willRemove = reading?.cells.includes(cell) ?? false;

    this.clearHoverCell();
    const group = L.layerGroup();
    const polys = cellsToMultiPolygon([cell]);
    for (const poly of polys) {
      const latlngs = poly.map(ring => ring.map(([la, ln]) => [la, ln] as L.LatLngTuple));
      L.polygon(latlngs, {
        color:       willRemove ? '#F05A28' : '#4FAFCB',
        fillColor:   willRemove ? '#F05A28' : '#4FAFCB',
        fillOpacity: 0.35,
        weight:      2,
        opacity:     0.9,
        className:   'hover-hex'
      }).addTo(group);
    }
    group.addTo(this.map);
    this.hoverGroup = group;
  }

  private clearHoverCell(): void {
    if (this.hoverGroup) { this.hoverGroup.remove(); this.hoverGroup = null; }
  }

  // ── Pending marker ───────────────────────────────────

  private syncPendingMarker(pending: { lat: number; lng: number } | null): void {
    if (this.pendingMarker) { this.pendingMarker.remove(); this.pendingMarker = null; }
    if (pending) {
      this.pendingMarker = L.marker([pending.lat, pending.lng], {
        icon: L.divIcon({ html: '<div class="pending-marker">+</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 14] }),
        interactive: false
      }).addTo(this.map);
    }
  }

  // ── Preview ──────────────────────────────────────────

  private syncPreview(cells: string[]): void {
    if (this.previewGroup) { this.previewGroup.remove(); this.previewGroup = null; }
    if (!cells.length) return;
    const group = L.layerGroup();
    const multiPoly = cellsToMultiPolygon(cells);
    for (const poly of multiPoly) {
      const latlngs = poly.map(ring => ring.map(([lat, lng]) => [lat, lng] as L.LatLngTuple));
      L.polygon(latlngs, {
        color: '#F05A28', fillColor: '#F05A28',
        fillOpacity: 0.10, weight: 1.5, opacity: 0.6,
        dashArray: '5 4', className: 'preview-hex'
      }).addTo(group);
    }
    group.addTo(this.map);
    this.previewGroup = group;
  }

  // ── Hexagons ─────────────────────────────────────────

  private syncHexagons(readings: NoiseReading[]): void {
    const currentIds = new Set(readings.map(r => r.id));
    this.hexMap.forEach((group, id) => {
      if (!currentIds.has(id)) {
        group.remove(); this.hexMap.delete(id); this.hexMeta.delete(id);
      }
    });
    for (const r of readings) {
      const newSig = r.color + ':' + r.cells.length + ':' + (r.cells[0] ?? '');
      const meta   = this.hexMeta.get(r.id);
      if (!this.hexMap.has(r.id)) {
        this.hexMap.set(r.id, this.createHexGroup(r));
        this.hexMeta.set(r.id, { color: r.color, cellsSig: newSig });
      } else if (meta && meta.cellsSig !== newSig) {
        this.hexMap.get(r.id)!.remove();
        this.hexMap.set(r.id, this.createHexGroup(r));
        this.hexMeta.set(r.id, { color: r.color, cellsSig: newSig });
      }
    }
  }

  private createHexGroup(r: NoiseReading): L.LayerGroup {
    const group = L.layerGroup();

    const multiPoly = cellsToMultiPolygon(r.cells);
    for (const poly of multiPoly) {
      const latlngs = poly.map(ring => ring.map(([lat, lng]) => [lat, lng] as L.LatLngTuple));
      const polygon = L.polygon(latlngs, {
        color: r.color, fillColor: r.color,
        fillOpacity: 0.22, weight: 1.5, opacity: 0.9,
        className: 'noise-hex'
      });
      polygon.bindTooltip(this.buildTooltip(r), {
        permanent: false, className: 'noise-tooltip', direction: 'top'
      });
      polygon.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const editId = this.uiState.cellEditId();
        if (editId) {
          this.toggleCell(editId, e.latlng.lat, e.latlng.lng);
        } else {
          this.uiState.select(r.id);
        }
      });
      group.addLayer(polygon);
    }

    group.addLayer(L.marker([r.lat, r.lng], {
      icon: L.divIcon({
        html: `<div class="hex-label hex-label-${r.noiseLevel.toLowerCase()}">${r.noiseLevel[0]}</div>`,
        className: '', iconSize: [20, 20], iconAnchor: [10, 10]
      }),
      interactive: false
    }));

    group.addTo(this.map);
    return group;
  }

  private buildTooltip(r: NoiseReading): string {
    const ts = r.timestamp.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const sec = r.emissionType === 'sector'
      ? ` <span style="color:#5a8ab0">${r.azimuth}° / ${r.beamAngle}°</span>` : '';
    return `<b style="color:${r.color}">${r.frequency} MHz</b> <span style="color:#5a8ab0">${r.band}</span>${sec}<br>`
         + `<span style="color:${r.color}">${r.noiseLevel}</span> &nbsp; ${r.power}W &nbsp; ${r.cells.length} cells<br>`
         + `<span style="color:#4a8aaa;font-size:10px">${ts}</span>`;
  }
}
