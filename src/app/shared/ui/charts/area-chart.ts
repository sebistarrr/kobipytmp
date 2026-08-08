import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { smoothPath } from './sparkline';

export interface AreaSeries {
  readonly key: string;
  readonly label: string;
  readonly tone: string;
  readonly values: readonly number[];
  /** Une série de référence est tracée en pointillés, sans aplat. */
  readonly reference?: boolean;
}

/**
 * Courbe d'évolution multi-séries.
 *
 * Le survol place un repère vertical et affiche les valeurs de toutes les
 * séries au même instant : l'analyste compare volumes générés et traités sans
 * avoir à viser un point précis.
 */
@Component({
  selector: 'app-area-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <svg
        class="chart__svg"
        [attr.viewBox]="'0 0 ' + W + ' ' + H"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="ariaLabel()"
        (mousemove)="onMove($event)"
        (mouseleave)="hover.set(null)"
      >
        <defs>
          @for (series of series(); track series.key) {
            <linearGradient [attr.id]="uid + '-' + series.key" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" [attr.stop-color]="series.tone" stop-opacity="0.22" />
              <stop offset="100%" [attr.stop-color]="series.tone" stop-opacity="0" />
            </linearGradient>
          }
        </defs>

        <!-- Lignes de repère horizontales -->
        @for (line of gridLines(); track line.value) {
          <line
            class="chart__grid"
            [attr.x1]="PAD_L"
            [attr.x2]="W - PAD_R"
            [attr.y1]="line.y"
            [attr.y2]="line.y"
          />
          <text class="chart__tick" [attr.x]="PAD_L - 8" [attr.y]="line.y + 3.5">{{ line.value }}</text>
        }

        @for (plot of plots(); track plot.key) {
          @if (!plot.reference) {
            <path [attr.d]="plot.area" [attr.fill]="'url(#' + uid + '-' + plot.key + ')'" />
          }
          <path
            [attr.d]="plot.line"
            fill="none"
            [attr.stroke]="plot.tone"
            stroke-width="1.8"
            [attr.stroke-dasharray]="plot.reference ? '4 4' : null"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        }

        <!-- Repère de survol -->
        @if (hover() !== null) {
          <line
            class="chart__cursor"
            [attr.x1]="cursorX()"
            [attr.x2]="cursorX()"
            [attr.y1]="PAD_T"
            [attr.y2]="H - PAD_B"
          />
          @for (point of hoverPoints(); track point.key) {
            <circle
              [attr.cx]="cursorX()"
              [attr.cy]="point.y"
              r="3.2"
              [attr.fill]="point.tone"
              stroke="var(--bg-surface)"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
            />
          }
        }
      </svg>

      <!-- Étiquettes de l'axe temporel -->
      <div class="chart__axis">
        @for (label of axisLabels(); track label.index) {
          <span class="chart__axis-label" [style.left.%]="label.percent">{{ label.text }}</span>
        }
      </div>

      @if (hover() !== null) {
        <div class="chart__tip" [style.left.%]="tooltipPercent()" [attr.data-flip]="tooltipFlip()">
          <p class="chart__tip-date">{{ hoveredLabel() }}</p>
          @for (point of hoverPoints(); track point.key) {
            <p class="chart__tip-row">
              <span class="dot" [style.background]="point.tone"></span>
              <span class="chart__tip-label">{{ point.label }}</span>
              <strong class="chart__tip-value">{{ point.value }}</strong>
            </p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .chart {
      position: relative;
      width: 100%;
    }

    .chart__svg {
      display: block;
      width: 100%;
      height: var(--chart-height, 200px);
      overflow: visible;
    }

    .chart__grid {
      stroke: var(--grid-line);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }

    .chart__tick {
      fill: var(--text-tertiary);
      font-size: 8px;
      text-anchor: end;
      font-family: var(--font-sans);
    }

    .chart__cursor {
      stroke: var(--border-strong);
      stroke-width: 1;
      stroke-dasharray: 3 3;
      vector-effect: non-scaling-stroke;
    }

    .chart__axis {
      position: relative;
      height: 18px;
      margin-top: var(--sp-1);
    }

    .chart__axis-label {
      position: absolute;
      transform: translateX(-50%);
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .chart__tip {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      min-width: 148px;
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--r-md);
      border: 1px solid var(--border-default);
      background: var(--bg-overlay);
      box-shadow: var(--shadow-lg);
      pointer-events: none;
      z-index: var(--z-tooltip);
      animation: fade-in var(--dur-instant) var(--ease-out);
    }

    .chart__tip[data-flip='left'] {
      transform: translateX(-100%) translateX(-10px);
    }
    .chart__tip[data-flip='right'] {
      transform: translateX(10px);
    }

    .chart__tip-date {
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      margin-bottom: var(--sp-1);
      text-transform: capitalize;
    }

    .chart__tip-row {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      font-size: var(--fs-xs);
      line-height: 1.7;
    }

    .chart__tip-label {
      flex: 1;
      color: var(--text-tertiary);
    }

    .chart__tip-value {
      color: var(--text-primary);
      font-weight: var(--fw-semibold);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class AreaChartComponent {
  readonly series = input.required<readonly AreaSeries[]>();
  /** Une étiquette par point, alignée sur l'index des valeurs. */
  readonly labels = input.required<readonly string[]>();
  readonly ariaLabel = input('Évolution du volume d’alertes');

  protected readonly W = 300;
  protected readonly H = 140;
  protected readonly PAD_L = 22;
  protected readonly PAD_R = 4;
  protected readonly PAD_T = 8;
  protected readonly PAD_B = 6;

  private static instances = 0;
  protected readonly uid = `area-${++AreaChartComponent.instances}`;

  protected readonly hover = signal<number | null>(null);

  private readonly pointCount = computed(() =>
    Math.max(...this.series().map((s) => s.values.length), 0),
  );

  private readonly maxValue = computed(() => {
    const values = this.series().flatMap((s) => [...s.values]);
    const max = values.length > 0 ? Math.max(...values) : 0;
    /* Arrondi à un palier lisible pour que les graduations tombent juste. */
    if (max <= 4) return 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / (magnitude / 2)) * (magnitude / 2);
  });

  protected readonly gridLines = computed(() => {
    const max = this.maxValue();
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round((max / steps) * (steps - i));
      return { value, y: this.yFor(value) };
    });
  });

  private xFor(index: number): number {
    const count = this.pointCount();
    if (count <= 1) return this.PAD_L;
    const usable = this.W - this.PAD_L - this.PAD_R;
    return this.PAD_L + (index / (count - 1)) * usable;
  }

  private yFor(value: number): number {
    const usable = this.H - this.PAD_T - this.PAD_B;
    const max = this.maxValue() || 1;
    return this.PAD_T + usable - (value / max) * usable;
  }

  protected readonly plots = computed(() =>
    this.series().map((series) => {
      const points = series.values.map((value, index) => ({ x: this.xFor(index), y: this.yFor(value) }));
      const line = smoothPath(points);
      const last = points[points.length - 1];
      const first = points[0];
      const area =
        first && last
          ? `${line} L ${last.x} ${this.H - this.PAD_B} L ${first.x} ${this.H - this.PAD_B} Z`
          : '';
      return { key: series.key, tone: series.tone, reference: series.reference ?? false, line, area };
    }),
  );

  protected readonly cursorX = computed(() => this.xFor(this.hover() ?? 0));

  protected readonly hoverPoints = computed(() => {
    const index = this.hover();
    if (index === null) return [];
    return this.series().map((series) => ({
      key: series.key,
      label: series.label,
      tone: series.tone,
      value: series.values[index] ?? 0,
      y: this.yFor(series.values[index] ?? 0),
    }));
  });

  protected readonly hoveredLabel = computed(() => {
    const index = this.hover();
    return index === null ? '' : (this.labels()[index] ?? '');
  });

  protected readonly tooltipPercent = computed(() => (this.cursorX() / this.W) * 100);

  /** Le repère se retourne près des bords pour rester dans le cadre. */
  protected readonly tooltipFlip = computed(() => {
    const percent = this.tooltipPercent();
    if (percent > 76) return 'left';
    if (percent < 18) return 'right';
    return null;
  });

  /** Quelques étiquettes seulement : au-delà, l'axe devient illisible. */
  protected readonly axisLabels = computed(() => {
    const labels = this.labels();
    const count = labels.length;
    if (count === 0) return [];
    const desired = Math.min(6, count);
    const step = Math.max(1, Math.floor((count - 1) / (desired - 1 || 1)));

    const result: { index: number; text: string; percent: number }[] = [];
    for (let i = 0; i < count; i += step) {
      result.push({ index: i, text: labels[i]!, percent: (this.xFor(i) / this.W) * 100 });
    }
    const last = count - 1;
    if (result[result.length - 1]?.index !== last) {
      result.push({ index: last, text: labels[last]!, percent: (this.xFor(last) / this.W) * 100 });
    }
    return result;
  });

  protected onMove(event: MouseEvent): void {
    const target = event.currentTarget as SVGSVGElement;
    const bounds = target.getBoundingClientRect();
    if (bounds.width === 0) return;

    /* Conversion pixels écran → unités du viewBox, puis vers l'index le plus proche. */
    const viewX = ((event.clientX - bounds.left) / bounds.width) * this.W;
    const usable = this.W - this.PAD_L - this.PAD_R;
    const ratio = (viewX - this.PAD_L) / usable;
    const index = Math.round(ratio * (this.pointCount() - 1));

    this.hover.set(Math.max(0, Math.min(this.pointCount() - 1, index)));
  }
}
