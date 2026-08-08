import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  COMPARISON_RESULT_META,
  buildComparisonRows,
  type Client,
  type ComparisonResult,
  type MatchAttribute,
  type MatchCriterion,
  type ProfileAlias,
  type ScreeningProfile,
} from '../../../../core/models';
import { IconComponent, type IconName } from '../../../../shared/ui/icon/icon';
import { formatComparisonValue } from '../../../../shared/util/display';

/**
 * Comparateur attribut par attribut.
 *
 * C'est la pièce qui répond à la question centrale de l'analyste : sur quoi,
 * exactement, le système fonde-t-il ce rapprochement, et où sont les écarts.
 * Chaque ligne porte son verdict, sa contribution au score et la raison
 * retenue par le moteur, consultable au survol.
 */
@Component({
  selector: 'app-comparison-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ct">
      <!-- En-têtes de colonnes -->
      <div class="ct__head">
        <span class="ct__col-attr">Attribut</span>
        <span class="ct__col-value">
          <app-icon name="user" [size]="12" />
          Client
        </span>
        <span class="ct__col-value">
          <app-icon name="radar" [size]="12" />
          Fiche {{ provider() }}
        </span>
        <span class="ct__col-result">Résultat</span>
      </div>

      @for (row of rows(); track row.attribute) {
        <div
          class="ct__row"
          [attr.data-result]="row.result"
          [style.--tone]="'var(' + toneOf(row.result) + ')'"
          [title]="row.rationale"
        >
          <span class="ct__attr">
            {{ row.label }}
            <span class="ct__weight">{{ row.weight }} %</span>
          </span>

          <span class="ct__value" [class.is-empty]="!row.clientValue">
            {{ row.clientValue || 'Non renseigné' }}
          </span>

          <span class="ct__value" [class.is-empty]="!row.profileValue">
            {{ row.profileValue || 'Non renseigné' }}
            @if (row.attribute === 'lastName' || row.attribute === 'firstName') {
              @if (aliasApplied()) {
                <span class="ct__alias-tag">alias</span>
              }
            }
          </span>

          <span class="ct__result">
            <span class="ct__result-icon">
              <app-icon [name]="iconOf(row.result)" [size]="12" [strokeWidth]="2.4" />
            </span>
            <span class="ct__result-label">{{ labelOf(row.result) }}</span>
            <span class="ct__result-score">{{ row.score }} %</span>
          </span>
        </div>
      }

      <!-- Synthèse -->
      <div class="ct__foot">
        <span class="ct__foot-item" data-tone="success">
          <span class="dot"></span>
          {{ tally().match }} correspondance{{ tally().match > 1 ? 's' : '' }}
        </span>
        <span class="ct__foot-item" data-tone="warning">
          <span class="dot"></span>
          {{ tally().partial }} partielle{{ tally().partial > 1 ? 's' : '' }}
        </span>
        <span class="ct__foot-item" data-tone="critical">
          <span class="dot"></span>
          {{ tally().divergence }} divergence{{ tally().divergence > 1 ? 's' : '' }}
        </span>
        <span class="ct__foot-item" data-tone="neutral">
          <span class="dot"></span>
          {{ tally().missing }} non renseigné{{ tally().missing > 1 ? 's' : '' }}
        </span>
        <span class="ct__foot-item" data-tone="info">
          <span class="dot"></span>
          {{ tally().uncertain }} incertain{{ tally().uncertain > 1 ? 's' : '' }}
        </span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .ct {
      display: flex;
      flex-direction: column;
    }

    .ct__head,
    .ct__row {
      display: grid;
      grid-template-columns: minmax(140px, 1fr) minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(150px, 0.9fr);
      gap: var(--sp-4);
      align-items: center;
    }

    .ct__head {
      padding: 0 var(--sp-3) var(--sp-2);
      border-bottom: 1px solid var(--border-default);
    }

    .ct__head span {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .ct__row {
      position: relative;
      padding: var(--sp-3);
      border-bottom: 1px solid var(--border-subtle);
      border-left: 2px solid transparent;
      border-radius: 0 var(--r-sm) var(--r-sm) 0;
      transition: background var(--dur-fast) var(--ease-out);
    }

    .ct__row:hover {
      background: var(--bg-hover);
    }

    /* Seuls les écarts portent un filet coloré : les correspondances restent sobres. */
    .ct__row[data-result='DIVERGENCE'],
    .ct__row[data-result='UNCERTAIN'],
    .ct__row[data-result='PARTIAL'] {
      border-left-color: var(--tone);
      background: color-mix(in srgb, var(--tone) 4%, transparent);
    }

    .ct__row:last-of-type {
      border-bottom: none;
    }

    .ct__attr {
      display: flex;
      align-items: baseline;
      gap: var(--sp-2);
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-secondary);
      min-width: 0;
    }

    .ct__weight {
      font-size: 10px;
      color: var(--text-disabled);
      font-variant-numeric: tabular-nums;
    }

    .ct__value {
      font-size: var(--fs-sm);
      color: var(--text-primary);
      overflow-wrap: anywhere;
      min-width: 0;
    }

    .ct__value.is-empty {
      color: var(--text-disabled);
      font-style: italic;
      font-size: var(--fs-xs);
    }

    .ct__alias-tag {
      display: inline-block;
      margin-left: var(--sp-2);
      padding: 1px 5px;
      border-radius: var(--r-xs);
      background: var(--accent-soft);
      color: var(--accent-text);
      font-size: 10px;
      font-weight: var(--fw-medium);
      vertical-align: middle;
    }

    .ct__result {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      min-width: 0;
    }

    .ct__result-icon {
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      flex: none;
      border-radius: var(--r-xs);
      color: var(--tone);
      background: color-mix(in srgb, var(--tone) 15%, transparent);
    }

    .ct__result-label {
      flex: 1;
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--tone);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ct__result-score {
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
      font-variant-numeric: tabular-nums;
      flex: none;
    }

    .ct__foot {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-4);
      padding: var(--sp-3);
      margin-top: var(--sp-2);
      border-top: 1px solid var(--border-default);
    }

    .ct__foot-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }

    .ct__foot-item[data-tone='success'] .dot {
      background: var(--success);
    }
    .ct__foot-item[data-tone='warning'] .dot {
      background: var(--warning);
    }
    .ct__foot-item[data-tone='critical'] .dot {
      background: var(--critical);
    }
    .ct__foot-item[data-tone='neutral'] .dot {
      background: var(--neutral);
    }
    .ct__foot-item[data-tone='info'] .dot {
      background: var(--info);
    }

    /* Sur écran étroit, chaque ligne devient un bloc empilé et légendé. */
    @media (max-width: 900px) {
      .ct__head {
        display: none;
      }

      .ct__row {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--sp-1);
        padding: var(--sp-3);
        border-left-width: 2px;
      }

      .ct__value::before {
        display: block;
        font-size: 10px;
        letter-spacing: var(--ls-wide);
        text-transform: uppercase;
        color: var(--text-tertiary);
      }

      .ct__value:nth-of-type(1)::before {
        content: 'Client';
      }

      .ct__value:nth-of-type(2)::before {
        content: 'Fiche de screening';
      }

      .ct__result {
        margin-top: var(--sp-1);
      }
    }
  `,
})
export class ComparisonTableComponent {
  readonly client = input.required<Client>();
  readonly profile = input.required<ScreeningProfile>();
  readonly criteria = input.required<readonly MatchCriterion[]>();
  /** Alias retenu : il remplace le nom principal dans la colonne fournisseur. */
  readonly alias = input<ProfileAlias | null>(null);

  protected readonly provider = computed(() => this.profile().provider);

  /** Vrai lorsque l'alias affiché diffère du nom principal de la fiche. */
  protected readonly aliasApplied = computed(() => {
    const alias = this.alias();
    if (!alias) return false;
    return alias.fullName !== `${this.profile().firstName} ${this.profile().lastName}`;
  });

  protected readonly rows = computed(() => {
    const alias = this.alias();
    let overrides: Partial<Record<MatchAttribute, string | null>> | undefined;

    if (alias && this.aliasApplied()) {
      /* L'alias porte un nom complet : on le scinde pour alimenter les deux
         lignes de nom. Le dernier mot est traité comme le patronyme. */
      const parts = alias.fullName.trim().split(/\s+/);
      const lastName = parts.length > 1 ? parts[parts.length - 1]! : alias.fullName;
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
      overrides = { lastName, firstName: firstName || null };
    }

    return buildComparisonRows(this.client(), this.profile(), this.criteria(), overrides).map(
      (row) => ({
        ...row,
        clientValue: formatComparisonValue(row.attribute, row.clientValue),
        profileValue: formatComparisonValue(row.attribute, row.profileValue),
      }),
    );
  });

  protected readonly tally = computed(() => {
    const rows = this.rows();
    return {
      match: rows.filter((row) => row.result === 'MATCH').length,
      partial: rows.filter((row) => row.result === 'PARTIAL').length,
      divergence: rows.filter((row) => row.result === 'DIVERGENCE').length,
      missing: rows.filter((row) => row.result === 'MISSING').length,
      uncertain: rows.filter((row) => row.result === 'UNCERTAIN').length,
    };
  });

  protected toneOf(result: ComparisonResult): string {
    return COMPARISON_RESULT_META[result].colorVar;
  }

  protected labelOf(result: ComparisonResult): string {
    return COMPARISON_RESULT_META[result].label;
  }

  protected iconOf(result: ComparisonResult): IconName {
    switch (COMPARISON_RESULT_META[result].icon) {
      case 'check':
        return 'check';
      case 'approx':
        return 'approx';
      case 'cross':
        return 'x';
      case 'minus':
        return 'minus';
      case 'question':
        return 'question';
    }
  }
}
