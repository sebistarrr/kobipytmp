import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../icon/icon';

/**
 * Champ de recherche des barres de filtres.
 *
 * Extrait des écrans « Alertes à traiter » et « Alertes traitées », qui en
 * portaient chacun leur copie avec des styles légèrement divergents.
 */
@Component({
  selector: 'app-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <label class="sf">
      <app-icon name="search" [size]="15" />
      <input
        type="search"
        class="sf__input"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="onInput($event)"
        [attr.aria-label]="ariaLabel() || placeholder()"
      />
      @if (value()) {
        <button
          type="button"
          class="sf__clear"
          (click)="search.emit('')"
          aria-label="Effacer la recherche"
        >
          <app-icon name="x" [size]="13" />
        </button>
      }
    </label>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-width: 240px;
      max-width: var(--search-max, 460px);
    }

    .sf {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      width: 100%;
      height: 34px;
      padding: 0 var(--sp-2) 0 var(--sp-3);
      border-radius: var(--r-md);
      border: 1px solid var(--border-default);
      background: var(--bg-inset);
      color: var(--text-tertiary);
      transition:
        border-color var(--dur-fast) var(--ease-out),
        box-shadow var(--dur-fast) var(--ease-out),
        background var(--dur-fast) var(--ease-out);
    }

    .sf:focus-within {
      border-color: var(--border-focus);
      box-shadow: var(--shadow-focus);
      background: var(--bg-surface);
    }

    .sf__input {
      flex: 1;
      min-width: 0;
      background: none;
      border: none;
      font-size: var(--fs-sm);
      color: var(--text-primary);
    }

    .sf__input::placeholder {
      color: var(--text-tertiary);
    }

    /* La croix native fait doublon avec le bouton d'effacement. */
    .sf__input::-webkit-search-cancel-button {
      appearance: none;
    }

    .sf__clear {
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      flex: none;
      border-radius: var(--r-sm);
      color: var(--text-tertiary);
      transition:
        background var(--dur-fast) var(--ease-out),
        color var(--dur-fast) var(--ease-out);
    }

    .sf__clear:hover {
      background: var(--bg-active);
      color: var(--text-primary);
    }
  `,
})
export class SearchFieldComponent {
  readonly value = input('');
  readonly placeholder = input('Rechercher…');
  readonly ariaLabel = input('');
  readonly search = output<string>();

  protected onInput(event: Event): void {
    this.search.emit((event.target as HTMLInputElement).value);
  }
}
