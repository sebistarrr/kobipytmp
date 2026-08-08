import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  COMPARISON_RESULT_META,
  MATCH_ATTRIBUTE_LABELS,
  type MatchCriterion,
} from '../../../core/models';
import { IconComponent } from '../icon/icon';
import { comparisonIcon } from '../../util/display';

/**
 * Décomposition du score.
 *
 * Le score global seul ne dit rien à l'analyste. Cette vue montre la
 * contribution de chaque attribut, son poids dans le calcul, et la raison
 * retenue par le moteur — de sorte qu'un score de 94 % puisse être défendu ou
 * contesté ligne par ligne.
 */
@Component({
  selector: 'app-match-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <ul class="bd">
      @for (row of rows(); track row.attribute) {
        <li class="bd__row" [style.--tone]="'var(' + row.colorVar + ')'">
          <span class="bd__icon" [attr.aria-label]="row.resultLabel">
            <app-icon [name]="row.icon" [size]="12" [strokeWidth]="2.2" />
          </span>

          <span class="bd__label truncate" [title]="row.label">{{ row.label }}</span>

          @if (showWeight()) {
            <span class="bd__weight" [title]="'Poids de cet attribut dans le score global'">
              {{ row.weight }} %
            </span>
          }

          <span class="bd__bar">
            <span class="bd__fill" [style.width.%]="row.score"></span>
          </span>

          <span class="bd__score">{{ row.score }} %</span>
        </li>
      }
    </ul>

    @if (showWeight()) {
      <p class="bd__foot">
        Score global = moyenne des contributions pondérées par le poids de chaque attribut.
      </p>
    }
  `,
  styles: `
    .bd {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .bd__row {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) auto minmax(56px, 1.1fr) 42px;
      align-items: center;
      gap: var(--sp-2);
      padding: 5px var(--sp-2);
      border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }

    .bd__row:hover {
      background: var(--bg-hover);
    }

    .bd__icon {
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border-radius: var(--r-xs);
      color: var(--tone);
      background: color-mix(in srgb, var(--tone) 14%, transparent);
    }

    .bd__label {
      font-size: var(--fs-xs);
      color: var(--text-secondary);
    }

    .bd__weight {
      font-size: 10px;
      color: var(--text-tertiary);
      font-variant-numeric: tabular-nums;
      padding: 1px 4px;
      border-radius: var(--r-xs);
      background: var(--bg-active);
    }

    .bd__bar {
      height: 4px;
      border-radius: var(--r-full);
      background: var(--bg-active);
      overflow: hidden;
    }

    .bd__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--tone);
      transition: width 700ms var(--ease-out);
    }

    .bd__score {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .bd__foot {
      margin-top: var(--sp-3);
      padding-top: var(--sp-3);
      border-top: 1px solid var(--border-subtle);
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    @media (max-width: 720px) {
      .bd__row {
        grid-template-columns: 18px minmax(0, 1fr) auto 42px;
      }
      .bd__bar {
        display: none;
      }
    }
  `,
})
export class MatchBreakdownComponent {
  readonly criteria = input.required<readonly MatchCriterion[]>();
  readonly showWeight = input(true);

  protected readonly rows = computed(() =>
    this.criteria().map((criterion) => {
      const meta = COMPARISON_RESULT_META[criterion.result];
      return {
        attribute: criterion.attribute,
        label: MATCH_ATTRIBUTE_LABELS[criterion.attribute],
        score: criterion.score,
        weight: criterion.weight,
        colorVar: meta.colorVar,
        resultLabel: meta.label,
        icon: comparisonIcon(criterion.result),
      };
    }),
  );
}
