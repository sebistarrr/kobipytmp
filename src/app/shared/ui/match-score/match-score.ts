import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { SCORE_BAND_META, scoreBand } from '../../../core/models';

/**
 * Score de rapprochement.
 *
 * L'anneau se remplit et la valeur défile à l'apparition : le mouvement dure
 * moins d'une seconde et attire l'œil sur le chiffre qui conditionne toute la
 * suite de l'analyse. La couleur suit la bande de score, pas une préférence
 * esthétique — un score élevé est un signal de risque, pas une réussite.
 */
@Component({
  selector: 'app-match-score',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score" [attr.data-size]="size()" [style.--tone]="'var(' + meta().colorVar + ')'">
      <svg class="score__ring" [attr.viewBox]="'0 0 ' + box() + ' ' + box()" aria-hidden="true">
        <circle
          class="score__track"
          [attr.cx]="box() / 2"
          [attr.cy]="box() / 2"
          [attr.r]="radius()"
          [attr.stroke-width]="stroke()"
        />
        <circle
          class="score__value"
          [attr.cx]="box() / 2"
          [attr.cy]="box() / 2"
          [attr.r]="radius()"
          [attr.stroke-width]="stroke()"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="offset()"
          [attr.transform]="'rotate(-90 ' + box() / 2 + ' ' + box() / 2 + ')'"
        />
      </svg>

      <div class="score__inner">
        @if (showLabel()) {
          <span class="score__caption">Match</span>
        }
        <span class="score__number">
          {{ animated() }}<span class="score__unit">%</span>
        </span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .score {
      --dim: 96px;
      position: relative;
      width: var(--dim);
      height: var(--dim);
      display: grid;
      place-items: center;
      flex: none;
    }

    .score[data-size='sm'] {
      --dim: 46px;
    }
    .score[data-size='md'] {
      --dim: 72px;
    }
    .score[data-size='xl'] {
      --dim: 132px;
    }

    .score__ring {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .score__track {
      fill: none;
      stroke: var(--border-default);
    }

    .score__value {
      fill: none;
      stroke: var(--tone);
      stroke-linecap: round;
      transition: stroke-dashoffset 900ms var(--ease-out);
    }

    .score__inner {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      line-height: 1;
    }

    .score__caption {
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-widest);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .score__number {
      display: flex;
      align-items: baseline;
      font-size: calc(var(--dim) * 0.29);
      font-weight: var(--fw-bold);
      letter-spacing: var(--ls-tighter);
      color: var(--tone);
      font-variant-numeric: tabular-nums;
    }

    .score[data-size='sm'] .score__number {
      font-size: calc(var(--dim) * 0.34);
    }

    .score__unit {
      font-size: 0.5em;
      font-weight: var(--fw-semibold);
      margin-left: 1px;
      opacity: 0.75;
    }
  `,
})
export class MatchScoreComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly score = input.required<number>();
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('lg');
  readonly showLabel = input(true);
  /** Désactive le défilement du chiffre — utile dans les listes denses. */
  readonly animate = input(true);

  protected readonly meta = computed(() => SCORE_BAND_META[scoreBand(this.score())]);

  protected readonly box = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 46;
      case 'md':
        return 72;
      case 'xl':
        return 132;
      default:
        return 96;
    }
  });

  protected readonly stroke = computed(() => Math.max(3, Math.round(this.box() * 0.075)));
  protected readonly radius = computed(() => this.box() / 2 - this.stroke() / 2 - 1);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());

  private readonly progress = signal(0);
  protected readonly animated = signal(0);

  protected readonly offset = computed(
    () => this.circumference() * (1 - this.progress() / 100),
  );

  constructor() {
    effect((onCleanup) => {
      const target = Math.max(0, Math.min(100, Math.round(this.score())));

      if (!this.animate()) {
        this.progress.set(target);
        this.animated.set(target);
        return;
      }

      /* Deux temps : l'anneau est animé en CSS, le chiffre par interpolation. */
      const start = performance.now();
      const duration = 780;
      let frame = 0;

      const step = (now: number) => {
        const ratio = Math.min(1, (now - start) / duration);
        /* Décélération : la valeur finale se pose sans rebond. */
        const eased = 1 - Math.pow(1 - ratio, 3);
        this.animated.set(Math.round(target * eased));
        if (ratio < 1) frame = requestAnimationFrame(step);
      };

      this.progress.set(target);
      frame = requestAnimationFrame(step);

      onCleanup(() => cancelAnimationFrame(frame));
    });

    this.destroyRef.onDestroy(() => this.animated.set(0));
  }
}
