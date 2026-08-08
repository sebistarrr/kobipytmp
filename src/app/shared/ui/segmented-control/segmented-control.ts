import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

/**
 * Contrôle segmenté.
 *
 * Un seul composant pour tous les sélecteurs exclusifs courts de
 * l'application — périodes, portées, granularités. Auparavant chaque écran
 * redéfinissait son propre groupe de boutons, avec des rendus légèrement
 * différents d'un écran à l'autre.
 *
 * Le groupe est un `radiogroup` : les flèches déplacent la sélection, comme
 * l'attend un utilisateur au clavier.
 */
@Component({
  selector: 'app-segmented-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="radiogroup" [attr.aria-label]="ariaLabel()" (keydown)="onKeydown($event)">
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="seg__btn"
          role="radio"
          [class.is-active]="option.value === value()"
          [attr.aria-checked]="option.value === value()"
          [attr.tabindex]="option.value === value() ? 0 : -1"
          [attr.title]="option.hint || null"
          (click)="select.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .seg {
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border-radius: var(--r-md);
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
    }

    .seg__btn {
      height: 26px;
      padding: 0 var(--sp-3);
      border-radius: var(--r-sm);
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-tertiary);
      white-space: nowrap;
      transition:
        background var(--dur-fast) var(--ease-out),
        color var(--dur-fast) var(--ease-out),
        box-shadow var(--dur-fast) var(--ease-out);
    }

    .seg__btn:hover:not(.is-active) {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    .seg__btn.is-active {
      background: var(--bg-raised);
      color: var(--text-primary);
      box-shadow: var(--shadow-xs);
    }
  `,
})
export class SegmentedControlComponent<T extends string | number> {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = input.required<T>();
  readonly ariaLabel = input('Sélection');
  readonly select = output<T>();

  /** Flèches directionnelles : déplacement de la sélection dans le groupe. */
  protected onKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const options = this.options();
    const current = options.findIndex((option) => option.value === this.value());
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const next = (current + (forward ? 1 : -1) + options.length) % options.length;

    const target = options[next];
    if (!target) return;

    this.select.emit(target.value);

    /* Le focus suit la sélection, conformément au motif « radiogroup ». */
    const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.seg__btn',
    );
    buttons[next]?.focus();
  }
}
