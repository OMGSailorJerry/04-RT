import {
  Component, OnDestroy, AfterViewInit,
  inject, signal, effect, ChangeDetectionStrategy
} from '@angular/core';
import * as L from 'leaflet';
import { gridDisk, cellsToMultiPolygon, cellToLatLng } from 'h3-js';

import { RadioNoiseService } from '../../services/radio-noise.service';
import { UiStateService } from '../../services/ui-state.service';
import { NoiseReading, NoiseLevel } from '../../models/noise-reading.model';

interface HexMeta { color: string; k: number; }

@Component({
  selector: 'app-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `<div id="leaflet-map"></div>`,
  styleUrl: './map.component.css'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private noiseService = inject(RadioNoiseService);
  private uiState = inject(UiStateService);

  private map!: L.Map;
  private hexMap = new Map<string, L.LayerGroup>();
  private hexMeta = new Map<string, HexMeta>();
  private pendingMarker: L.Marker | null = null;
  private mapReady = signal(false);

  constructor() {
    effect(() => {
      if (!this.mapReady()) return;
      this.syncHexagons(this.noiseService.readings());
    });
    effect(() => {
      if (!this.mapReady()) return;
      this.syncPendingMarker(this.uiState.mapPending());
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.mapReady.set(true);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('leaflet-map', {
      center: [48.5, 32.0],
      zoom: 6,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB',
      maxZoom: 19
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.uiState.formMode() === 'add') {
        this.uiState.updatePending(e.latlng.lat, e.latlng.lng);
      } else {
        this.uiState.deselect();
      }
    });
  }

  private syncPendingMarker(pending: { lat: number; lng: number } | null): void {
    if (this.pendingMarker) {
      this.pendingMarker.remove();
      this.pendingMarker = null;
    }
    if (pending) {
      this.pendingMarker = L.marker([pending.lat, pending.lng], {
        icon: L.divIcon({
          html: '<div class="pending-marker">+</div>',
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        }),
        interactive: false
      }).addTo(this.map);
    }
  }

  private syncHexagons(readings: NoiseReading[]): void {
    const currentIds = new Set(readings.map(r => r.id));

    this.hexMap.forEach((group, id) => {
      if (!currentIds.has(id)) {
        group.remove();
        this.hexMap.delete(id);
        this.hexMeta.delete(id);
      }
    });

    for (const r of readings) {
      const newK = this.noiseRingSize(r.noiseLevel);
      const meta = this.hexMeta.get(r.id);

      if (!this.hexMap.has(r.id)) {
        this.hexMap.set(r.id, this.createHexGroup(r, newK));
        this.hexMeta.set(r.id, { color: r.color, k: newK });
      } else if (meta && (meta.color !== r.color || meta.k !== newK)) {
        this.hexMap.get(r.id)!.remove();
        this.hexMap.set(r.id, this.createHexGroup(r, newK));
        this.hexMeta.set(r.id, { color: r.color, k: newK });
      }
    }
  }

  private createHexGroup(r: NoiseReading, k: number): L.LayerGroup {
    const cells = gridDisk(r.h3Index, k);
    const multiPoly = cellsToMultiPolygon(cells);
    const group = L.layerGroup();

    const clickHandler = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      this.uiState.select(r.id);
    };

    for (const poly of multiPoly) {
      const latlngs = poly.map(ring =>
        ring.map(([lat, lng]) => [lat, lng] as L.LatLngTuple)
      );
      const polygon = L.polygon(latlngs, {
        color: r.color,
        fillColor: r.color,
        fillOpacity: 0.22,
        weight: 1.5,
        opacity: 0.9,
        className: 'noise-hex'
      });
      polygon.bindTooltip(this.buildTooltip(r), {
        permanent: false,
        className: 'noise-tooltip',
        direction: 'top'
      });
      polygon.on('click', clickHandler);
      group.addLayer(polygon);
    }

    const [clat, clng] = cellToLatLng(r.h3Index);
    const labelMarker = L.marker([clat, clng], {
      icon: L.divIcon({
        html: `<div class="hex-label hex-label-${r.noiseLevel.toLowerCase()}">${r.noiseLevel[0]}</div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      }),
      interactive: false
    });
    group.addLayer(labelMarker);

    group.addTo(this.map);
    return group;
  }

  private noiseRingSize(level: NoiseLevel): number {
    if (level === 'LOW')    return 1;
    if (level === 'MEDIUM') return 2;
    return 3;
  }

  private buildTooltip(r: NoiseReading): string {
    const ts = r.timestamp.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    return `<b style="color:${r.color}">${r.frequency} MHz</b> <span style="color:#5a8ab0">${r.band}</span><br>`
         + `<span style="color:${r.color}">${r.noiseLevel}</span><br>`
         + `<span style="color:#4a8aaa;font-size:10px">${ts}</span>`;
  }
}
