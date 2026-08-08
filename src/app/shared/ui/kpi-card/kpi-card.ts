import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent, type IconName } from '../icon/icon';
import { SparklineComponent } from '../charts/sparkline';

export type KpiTone = 'neutral' | 'accent' | 'critical' | 'warning' | 'success' | 'info';
export type TrendDirection = 'up' | 'down' | 'flat';

/**
 * Carte d'indicateur.
 *
 * Un point d'attention de conception : une hausse n'est pas toujours une bonne
 * nouvelle. `invertTrend` permet de dire qu'une progression du volume d'alertes
 * en attente doit se colorer comme une dégradation, alors qu'une progression
 * du volume traité est une amélioration.
 */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SparklineComponent, RouterLink],
  template: `
    <div class="kpi card" [class.card--interactive]="!!link()" [attr.data-tone]="tone()">
      @if (link()) {
        <a class="kpi__link" [routerLink]="link()" [queryParams]="linkParams()" [attr.aria-label]="label()"></a>
      }

      <header class="kpi__head">
        <span class="kpi__glyph">
          <app-icon [name]="icon()" [size]="15" />
        </span>
        <span class="kpi__label truncate">{{ label() }}</span>
        @if (link()) {
          <app-icon class="kpi__chev" name="chevron-right" [size]="14" />
        }
      </header>

      <div class="kpi__body">
        <div class="kpi__figures">
          <p class="kpi__value">
            {{ displayValue() }}<span class="kpi__suffix">{{ suffix() }}</span>
          </p>

          @if (delta() !== null) {
            <p class="kpi__delta" [attr.data-dir]="sentiment()">
              <app-icon [name]="trendIcon()" [size]="12" [strokeWidth]="2.2" />
              <span>{{ deltaLabel() }}</span>
              <span class="kpi__delta-period">{{ period() }}</span>
            </p>
          } @else if (hint()) {
            <p class="kpi__hint">{{ hint() }}</p>
          }
        </div>

        @if (series().length > 1) {
          <div class="kpi__spark">
            <app-sparkline [values]="series()" [tone]="sparkTone()" />
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .kpi {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      padding: var(--sp-4);
      height: 100%;
      --tone: var(--neutral);
    }

    .kpi[data-tone='accent'] {
      --tone: var(--accent);
    }
    .kpi[data-tone='critical'] {
      --tone: var(--critical);
    }
    .kpi[data-tone='warning'] {
      --tone: var(--warning);
    }
    .kpi[data-tone='success'] {
      --tone: var(--success);
    }
    .kpi[data-tone='info'] {
      --tone: var(--info);
    }

    /* Le lien couvre la carte entière : toute la surface est cliquable. */
    .kpi__link {
      position: absolute;
      inset: 0;
      z-index: 1;
      border-radius: inherit;
    }

    .kpi__head {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }

    .kpi__glyph {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      flex: none;
      border-radius: var(--r-sm);
      color: var(--tone);
      background: color-mix(in srgb, var(--tone) 13%, transparent);
      border: 1px solid color-mix(in srgb, var(--tone) 22%, transparent);
    }

    .kpi__label {
      flex: 1;
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-secondary);
    }

    .kpi__chev {
      color: var(--text-disabled);
      transition:
        transform var(--dur-base) var(--ease-out),
        color var(--dur-base) var(--ease-out);
    }

    .kpi:hover .kpi__chev {
      transform: translateX(2px);
      color: var(--text-tertiary);
    }

    .kpi__body {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--sp-3);
      flex: 1;
    }

    .kpi__figures {
      min-width: 0;
    }

    .kpi__value {
      font-size: var(--fs-2xl);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-tighter);
      color: var(--text-primary);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
      animation: count-up var(--dur-slow) var(--ease-out) both;
    }

    .kpi__suffix {
      font-size: var(--fs-md);
      font-weight: var(--fw-medium);
      color: var(--text-tertiary);
      margin-left: 2px;
    }

    .kpi__delta {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: var(--sp-2);
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      font-variant-numeric: tabular-nums;
    }

    .kpi__delta[data-dir='good'] {
      color: var(--success-text);
    }
    .kpi__delta[data-dir='bad'] {
      color: var(--critical-text);
    }
    .kpi__delta[data-dir='flat'] {
      color: var(--text-tertiary);
    }

    .kpi__delta-period {
      color: var(--text-tertiary);
      font-weight: var(--fw-regular);
    }

    .kpi__hint {
      margin-top: var(--sp-2);
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
    }

    .kpi__spark {
      width: 88px;
      flex: none;
      --spark-height: 34px;
      opacity: 0.9;
    }

    @media (max-width: 900px) {
      .kpi__spark {
        display: none;
      }
    }
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly suffix = input('');
  readonly icon = input<IconName>('activity');
  readonly tone = input<KpiTone>('neutral');
  /** Variation en points de pourcentage. `null` masque la ligne de tendance. */
  readonly delta = input<number | null>(null);
  readonly period = input('vs 7 j');
  readonly series = input<readonly number[]>([]);
  readonly hint = input('');
  readonly link = input<string | null>(null);
  readonly linkParams = input<Record<string, string>>({});
  /** Inverse la lecture : une hausse devient un signal négatif. */
  readonly invertTrend = input(false);

  protected readonly displayValue = computed(() => {
    const value = this.value();
    return typeof value === 'number' ? new Intl.NumberFormat('fr-FR').format(value) : value;
  });

  protected readonly direction = computed<TrendDirection>(() => {
    const delta = this.delta();
    if (delta === null || Math.abs(delta) < 0.5) return 'flat';
    return delta > 0 ? 'up' : 'down';
  });

  protected readonly sentiment = computed(() => {
    const direction = this.direction();
    if (direction === 'flat') return 'flat';
    const isGood = this.invertTrend() ? direction === 'down' : direction === 'up';
    return isGood ? 'good' : 'bad';
  });

  protected readonly trendIcon = computed<IconName>(() => {
    switch (this.direction()) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'minus';
    }
  });

  protected readonly deltaLabel = computed(() => {
    const delta = this.delta();
    if (delta === null) return '';
    if (Math.abs(delta) < 0.5) return 'stable';
    return `${delta > 0 ? '+' : ''}${Math.round(delta)} %`;
  });

  protected readonly sparkTone = computed(() => {
    switch (this.tone()) {
      case 'critical':
        return 'var(--critical)';
      case 'warning':
        return 'var(--warning)';
      case 'success':
        return 'var(--success)';
      case 'info':
        return 'var(--info)';
      case 'accent':
        return 'var(--accent)';
      default:
        return 'var(--neutral)';
    }
  });
}
