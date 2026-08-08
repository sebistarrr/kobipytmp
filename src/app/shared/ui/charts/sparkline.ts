import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Courbe miniature accompagnant une valeur de KPI.
 *
 * Elle ne porte ni axe ni valeur : son rôle est de donner la forme de la
 * tendance d'un coup d'œil, pas de permettre une lecture chiffrée.
 */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="spark"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient [attr.id]="gradientId()" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="tone()" stop-opacity="0.24" />
          <stop offset="100%" [attr.stop-color]="tone()" stop-opacity="0" />
        </linearGradient>
      </defs>

      @if (filled()) {
        <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradientId() + ')'" />
      }

      <path
        [attr.d]="linePath()"
        fill="none"
        [attr.stroke]="tone()"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />

      @if (showLastPoint()) {
        <circle
          [attr.cx]="lastPoint().x"
          [attr.cy]="lastPoint().y"
          r="2"
          [attr.fill]="tone()"
          vector-effect="non-scaling-stroke"
        />
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .spark {
      display: block;
      width: 100%;
      height: var(--spark-height, 32px);
      overflow: visible;
    }
  `,
})
export class SparklineComponent {
  readonly values = input.required<readonly number[]>();
  readonly tone = input('var(--accent)');
  readonly filled = input(true);
  readonly showLastPoint = input(true);

  protected readonly width = 100;
  protected readonly height = 32;

  private static instances = 0;
  private readonly uid = `spark-${++SparklineComponent.instances}`;
  protected readonly gradientId = () => this.uid;

  private readonly points = computed(() => {
    const values = this.values();
    if (values.length === 0) return [{ x: 0, y: this.height / 2 }];
    if (values.length === 1) return [{ x: 0, y: this.height / 2 }, { x: this.width, y: this.height / 2 }];

    const min = Math.min(...values);
    const max = Math.max(...values);
    /* Amplitude plancher : une série plate reste une ligne, pas un pic. */
    const span = max - min || 1;
    const padding = 3;
    const usable = this.height - padding * 2;

    return values.map((value, index) => ({
      x: (index / (values.length - 1)) * this.width,
      y: padding + usable - ((value - min) / span) * usable,
    }));
  });

  protected readonly lastPoint = computed(() => this.points()[this.points().length - 1]!);

  protected readonly linePath = computed(() => smoothPath(this.points()));

  protected readonly areaPath = computed(() => {
    const points = this.points();
    if (points.length === 0) return '';
    return `${smoothPath(points)} L ${this.width} ${this.height} L 0 ${this.height} Z`;
  });
}

/**
 * Courbe lissée par des Béziers cubiques dont les tangentes suivent la pente
 * locale. Un simple `polyline` donnerait des angles peu lisibles à cette
 * taille.
 */
export function smoothPath(points: readonly { x: number; y: number }[], tension = 0.32): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${round(point.x)} ${round(point.y)}`).join(' ');
  }

  let path = `M ${round(points[0]!.x)} ${round(points[0]!.y)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const previous = points[i - 1] ?? points[i]!;
    const current = points[i]!;
    const next = points[i + 1]!;
    const following = points[i + 2] ?? next;

    const c1x = current.x + (next.x - previous.x) * tension * 0.5;
    const c1y = current.y + (next.y - previous.y) * tension * 0.5;
    const c2x = next.x - (following.x - current.x) * tension * 0.5;
    const c2y = next.y - (following.y - current.y) * tension * 0.5;

    path += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(next.x)} ${round(next.y)}`;
  }

  return path;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
