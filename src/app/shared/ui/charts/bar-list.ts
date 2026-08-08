import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface BarItem {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly tone: string;
  /** Précision affichée à droite de la valeur, par exemple un pourcentage. */
  readonly hint?: string;
}

/**
 * Barres horizontales.
 *
 * Préférées à un histogramme vertical pour les répartitions par statut : les
 * libellés métier sont longs, et un axe horizontal les rendrait illisibles.
 */
@Component({
  selector: 'app-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="bars">
      @for (item of items(); track item.key) {
        <li class="bars__row">
          <button
            type="button"
            class="bars__btn"
            [disabled]="!clickable()"
            (click)="select.emit(item.key)"
          >
            <span class="bars__head">
              <span class="bars__label truncate">{{ item.label }}</span>
              <span class="bars__value">
                {{ item.value }}
                @if (item.hint) {
                  <span class="bars__hint">{{ item.hint }}</span>
                }
              </span>
            </span>

            <span class="bars__track">
              <span
                class="bars__fill"
                [style.width.%]="width(item.value)"
                [style.background]="item.tone"
              ></span>
            </span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    .bars {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
    }

    .bars__btn {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      padding: var(--sp-2);
      border-radius: var(--r-sm);
      text-align: left;
      transition: background var(--dur-fast) var(--ease-out);
    }

    .bars__btn:not(:disabled):hover {
      background: var(--bg-hover);
    }

    .bars__btn:disabled {
      cursor: default;
    }

    .bars__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--sp-3);
    }

    .bars__label {
      font-size: var(--fs-xs);
      color: var(--text-secondary);
    }

    .bars__value {
      display: flex;
      align-items: baseline;
      gap: var(--sp-2);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .bars__hint {
      font-size: var(--fs-2xs);
      font-weight: var(--fw-regular);
      color: var(--text-tertiary);
    }

    .bars__track {
      display: block;
      height: 6px;
      border-radius: var(--r-full);
      background: var(--bg-active);
      overflow: hidden;
    }

    .bars__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 700ms var(--ease-out);
    }
  `,
})
export class BarListComponent {
  readonly items = input.required<readonly BarItem[]>();
  readonly clickable = input(false);
  readonly select = output<string>();

  private readonly max = computed(() => Math.max(...this.items().map((item) => item.value), 1));

  protected width(value: number): number {
    /* Un minimum visible : une valeur non nulle ne doit jamais disparaître. */
    const ratio = (value / this.max()) * 100;
    return value > 0 ? Math.max(2, ratio) : 0;
  }
}
