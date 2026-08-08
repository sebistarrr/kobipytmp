import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface DonutSegment {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly tone: string;
}

/**
 * Répartition en anneau.
 *
 * Le centre porte le total, la légende porte les valeurs : l'anneau lui-même
 * ne sert qu'à donner le rapport de proportion. Le survol isole un segment en
 * atténuant les autres plutôt qu'en le détachant, ce qui évite le mouvement
 * inutile.
 */
@Component({
  selector: 'app-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut">
      <div class="donut__figure">
        <svg viewBox="0 0 120 120" role="img" [attr.aria-label]="ariaLabel()">
          <circle
            class="donut__track"
            cx="60"
            cy="60"
            [attr.r]="RADIUS"
            [attr.stroke-width]="THICKNESS"
          />

          @for (arc of arcs(); track arc.key) {
            <circle
              class="donut__arc"
              cx="60"
              cy="60"
              [attr.r]="RADIUS"
              [attr.stroke]="arc.tone"
              [attr.stroke-width]="THICKNESS"
              [attr.stroke-dasharray]="arc.dashArray"
              [attr.stroke-dashoffset]="arc.dashOffset"
              stroke-linecap="butt"
              transform="rotate(-90 60 60)"
              [style.opacity]="dimmed(arc.key) ? 0.22 : 1"
              (mouseenter)="active.set(arc.key)"
              (mouseleave)="active.set(null)"
            />
          }
        </svg>

        <div class="donut__center">
          <span class="donut__total">{{ focused()?.value ?? total() }}</span>
          <span class="donut__caption">{{ focused()?.label ?? centerLabel() }}</span>
        </div>
      </div>

      <ul class="donut__legend">
        @for (segment of segments(); track segment.key) {
          <li
            class="donut__item"
            [class.is-dimmed]="dimmed(segment.key)"
            (mouseenter)="active.set(segment.key)"
            (mouseleave)="active.set(null)"
          >
            <span class="dot" [style.background]="segment.tone"></span>
            <span class="donut__label truncate">{{ segment.label }}</span>
            <span class="donut__value">{{ segment.value }}</span>
            <span class="donut__share">{{ share(segment.value) }} %</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .donut {
      display: flex;
      align-items: center;
      gap: var(--sp-6);
    }

    .donut__figure {
      position: relative;
      width: 132px;
      height: 132px;
      flex: none;
    }

    .donut__figure svg {
      width: 100%;
      height: 100%;
    }

    .donut__track {
      fill: none;
      stroke: var(--bg-active);
    }

    .donut__arc {
      fill: none;
      cursor: pointer;
      transition:
        opacity var(--dur-base) var(--ease-out),
        stroke-dashoffset 800ms var(--ease-out);
    }

    .donut__center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      pointer-events: none;
      text-align: center;
      padding: 0 var(--sp-6);
    }

    .donut__total {
      font-size: var(--fs-2xl);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-tighter);
      color: var(--text-primary);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .donut__caption {
      font-size: var(--fs-2xs);
      font-weight: var(--fw-medium);
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
      line-height: 1.2;
    }

    .donut__legend {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .donut__item {
      display: grid;
      grid-template-columns: 8px minmax(0, 1fr) auto 44px;
      align-items: center;
      gap: var(--sp-2);
      padding: 5px var(--sp-2);
      border-radius: var(--r-sm);
      cursor: default;
      transition:
        background var(--dur-fast) var(--ease-out),
        opacity var(--dur-base) var(--ease-out);
    }

    .donut__item:hover {
      background: var(--bg-hover);
    }

    .donut__item.is-dimmed {
      opacity: 0.4;
    }

    .donut__label {
      font-size: var(--fs-xs);
      color: var(--text-secondary);
    }

    .donut__value {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .donut__share {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 620px) {
      .donut {
        flex-direction: column;
        gap: var(--sp-4);
      }
      .donut__legend {
        width: 100%;
      }
    }
  `,
})
export class DonutChartComponent {
  readonly segments = input.required<readonly DonutSegment[]>();
  readonly centerLabel = input('Total');
  readonly ariaLabel = input('Répartition');

  protected readonly RADIUS = 50;
  protected readonly THICKNESS = 14;

  protected readonly active = signal<string | null>(null);

  protected readonly total = computed(() =>
    this.segments().reduce((sum, segment) => sum + segment.value, 0),
  );

  private readonly circumference = 2 * Math.PI * this.RADIUS;

  protected readonly arcs = computed(() => {
    const total = this.total() || 1;
    let consumed = 0;

    return this.segments().map((segment) => {
      const fraction = segment.value / total;
      const length = fraction * this.circumference;
      /* Fin liseré entre segments, sans jamais dépasser la longueur de l'arc. */
      const gap = Math.min(2, length);
      const arc = {
        key: segment.key,
        tone: segment.tone,
        dashArray: `${Math.max(0, length - gap)} ${this.circumference - Math.max(0, length - gap)}`,
        dashOffset: -consumed,
      };
      consumed += length;
      return arc;
    });
  });

  protected readonly focused = computed(() => {
    const key = this.active();
    if (!key) return null;
    return this.segments().find((segment) => segment.key === key) ?? null;
  });

  protected dimmed(key: string): boolean {
    const active = this.active();
    return active !== null && active !== key;
  }

  protected share(value: number): number {
    const total = this.total();
    return total === 0 ? 0 : Math.round((value / total) * 100);
  }
}
