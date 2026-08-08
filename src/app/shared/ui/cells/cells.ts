import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SCORE_BAND_META, scoreBand } from '../../../core/models';
import { AvatarComponent } from '../avatar/avatar';
import { IconComponent } from '../icon/icon';
import { AgePipe } from '../../pipes/format.pipes';

/* -----------------------------------------------------------------------------
   Score de rapprochement en cellule de tableau
   -------------------------------------------------------------------------- */

/**
 * La teinte suit la bande de score. Cette règle était auparavant recopiée dans
 * la feuille de styles de chaque écran de liste, avec le risque qu'un seuil
 * dérive d'un tableau à l'autre.
 */
@Component({
  selector: 'app-score-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="sc" [style.--tone]="'var(' + meta().colorVar + ')'" [attr.title]="title()">
      {{ score() }} %
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .sc {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      font-variant-numeric: tabular-nums;
      color: var(--tone);
      white-space: nowrap;
    }
  `,
})
export class ScoreCellComponent {
  readonly score = input.required<number>();

  protected readonly meta = computed(() => SCORE_BAND_META[scoreBand(this.score())]);
  protected readonly title = computed(() => `Rapprochement ${this.meta().label.toLowerCase()}`);
}

/* -----------------------------------------------------------------------------
   Analyste affecté
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-analyst-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent],
  template: `
    @if (name()) {
      <span class="ac">
        <app-avatar [name]="name()!" [hue]="hue()" size="xs" />
        <span class="ac__name truncate">{{ name() }}</span>
      </span>
    } @else {
      <span class="ac__empty">{{ emptyLabel() }}</span>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .ac {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      min-width: 0;
      max-width: 160px;
      font-size: var(--fs-xs);
      color: var(--text-secondary);
    }

    .ac__empty {
      font-size: var(--fs-xs);
      color: var(--text-disabled);
      font-style: italic;
    }
  `,
})
export class AnalystCellComponent {
  readonly name = input<string | null>(null);
  readonly hue = input(232);
  readonly emptyLabel = input('Non affectée');
}

/* -----------------------------------------------------------------------------
   Identité sur deux lignes (nom + référence ou contexte)
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-party-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pc">
      <span class="pc__name truncate">{{ name() }}</span>
      @if (meta()) {
        <span class="pc__meta truncate">{{ meta() }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .pc {
      display: flex;
      flex-direction: column;
      min-width: 0;
      max-width: var(--party-max, 260px);
      line-height: 1.3;
    }

    .pc__name {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
    }

    .pc__meta {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }
  `,
})
export class PartyCellComponent {
  readonly name = input.required<string>();
  readonly meta = input<string>('');
}

/* -----------------------------------------------------------------------------
   Ancienneté, signalée lorsqu'elle dépasse le délai attendu
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-age-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AgePipe],
  template: `
    <span class="agc" [class.is-late]="late()" [attr.title]="late() ? lateTitle() : null">
      @if (late()) {
        <app-icon name="clock" [size]="12" />
      }
      {{ since() | age }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .agc {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary);
    }

    .agc.is-late {
      color: var(--critical-text);
      font-weight: var(--fw-medium);
    }
  `,
})
export class AgeCellComponent {
  readonly since = input.required<string>();
  readonly late = input(false);
  readonly slaHours = input(0);

  protected readonly lateTitle = computed(
    () => `Hors délai — ${this.slaHours()} h attendues pour cette priorité`,
  );
}
