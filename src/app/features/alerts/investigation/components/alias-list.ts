import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { scoreBand, SCORE_BAND_META, type ProfileAlias } from '../../../../core/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';

/**
 * Alias portés par la fiche listée.
 *
 * Une fiche publie souvent plusieurs graphies : nom principal,
 * translittérations, noms d'usage. Sélectionner un alias recalcule la
 * comparaison sur cette graphie, ce qui permet de vérifier si la
 * correspondance tient sur une variante plutôt que sur le nom officiel.
 */
@Component({
  selector: 'app-alias-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <ul class="al">
      @for (alias of ordered(); track alias.id) {
        <li>
          <button
            type="button"
            class="al__item"
            [class.is-selected]="alias.id === selectedId()"
            [style.--tone]="'var(' + toneOf(alias.score) + ')'"
            (click)="select.emit(alias.id)"
            [attr.aria-pressed]="alias.id === selectedId()"
          >
            <span class="al__radio">
              @if (alias.id === selectedId()) {
                <app-icon name="check" [size]="11" [strokeWidth]="2.6" />
              }
            </span>

            <span class="al__body">
              <span class="al__name">{{ alias.fullName }}</span>
              <span class="al__meta">
                {{ alias.kind }}
                @if (alias.script) {
                  · {{ alias.script }}
                }
              </span>
            </span>

            <span class="al__bar">
              <span class="al__fill" [style.width.%]="alias.score"></span>
            </span>

            <span class="al__score">{{ alias.score }} %</span>
          </button>
        </li>
      }
    </ul>

    <p class="al__hint">
      <app-icon name="info" [size]="12" />
      L'alias retenu sert de base au comparateur. Le changer est tracé dans l'historique.
    </p>
  `,
  styles: `
    :host {
      display: block;
    }

    .al {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }

    .al__item {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) minmax(60px, 110px) 46px;
      align-items: center;
      gap: var(--sp-3);
      width: 100%;
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--r-md);
      border: 1px solid transparent;
      text-align: left;
      transition:
        background var(--dur-fast) var(--ease-out),
        border-color var(--dur-fast) var(--ease-out);
    }

    .al__item:hover {
      background: var(--bg-hover);
    }

    .al__item.is-selected {
      background: var(--accent-soft);
      border-color: var(--accent-border);
    }

    .al__radio {
      display: grid;
      place-items: center;
      width: 16px;
      height: 16px;
      border-radius: var(--r-full);
      border: 1.5px solid var(--border-strong);
      color: #fff;
      transition:
        background var(--dur-fast) var(--ease-out),
        border-color var(--dur-fast) var(--ease-out);
    }

    .al__item.is-selected .al__radio {
      background: var(--accent);
      border-color: var(--accent);
    }

    .al__body {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.3;
    }

    .al__name {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
      overflow-wrap: anywhere;
    }

    .al__meta {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }

    .al__bar {
      height: 5px;
      border-radius: var(--r-full);
      background: var(--bg-active);
      overflow: hidden;
    }

    .al__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--tone);
      transition: width 600ms var(--ease-out);
    }

    .al__score {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--tone);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .al__hint {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-2);
      margin-top: var(--sp-3);
      padding-top: var(--sp-3);
      border-top: 1px solid var(--border-subtle);
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .al__hint app-icon {
      margin-top: 1px;
    }

    @media (max-width: 620px) {
      .al__item {
        grid-template-columns: 18px minmax(0, 1fr) 46px;
      }
      .al__bar {
        display: none;
      }
    }
  `,
})
export class AliasListComponent {
  readonly aliases = input.required<readonly ProfileAlias[]>();
  readonly selectedId = input.required<string>();
  readonly select = output<string>();

  /** Le meilleur score en tête : c'est la graphie la plus probable. */
  protected readonly ordered = computed(() => [...this.aliases()].sort((a, b) => b.score - a.score));

  protected toneOf(score: number): string {
    return SCORE_BAND_META[scoreBand(score)].colorVar;
  }
}
