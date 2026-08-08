import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent, type IconName } from '../icon/icon';

/* -----------------------------------------------------------------------------
   État vide — jamais un simple « aucun résultat »
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="empty anim-fade-in" [attr.data-compact]="compact() || null">
      <span class="empty__glyph">
        <app-icon [name]="icon()" [size]="compact() ? 20 : 26" [strokeWidth]="1.5" />
      </span>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" class="btn btn--secondary btn--sm" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      padding: var(--sp-16) var(--sp-6);
      text-align: center;
    }

    .empty[data-compact] {
      padding: var(--sp-8) var(--sp-4);
      gap: var(--sp-2);
    }

    .empty__glyph {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: var(--r-xl);
      background: var(--bg-raised);
      border: 1px solid var(--border-subtle);
      color: var(--text-tertiary);
      margin-bottom: var(--sp-1);
    }

    .empty[data-compact] .empty__glyph {
      width: 40px;
      height: 40px;
      border-radius: var(--r-lg);
    }

    .empty__title {
      font-size: var(--fs-base);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .empty__message {
      max-width: 42ch;
      font-size: var(--fs-sm);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('inbox');
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly actionLabel = input<string>('');
  readonly compact = input(false);
  readonly action = output<void>();
}

/* -----------------------------------------------------------------------------
   État d'erreur
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="err anim-fade-in">
      <span class="err__glyph">
        <app-icon name="alert-triangle" [size]="24" [strokeWidth]="1.6" />
      </span>
      <h3 class="err__title">{{ title() }}</h3>
      <p class="err__message">{{ message() }}</p>
      <button type="button" class="btn btn--secondary btn--sm" (click)="retry.emit()">
        <app-icon name="refresh" [size]="13" />
        Réessayer
      </button>
    </div>
  `,
  styles: `
    .err {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-12) var(--sp-6);
      text-align: center;
    }

    .err__glyph {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: var(--r-xl);
      background: var(--critical-soft);
      border: 1px solid var(--critical-border);
      color: var(--critical-text);
    }

    .err__title {
      font-size: var(--fs-base);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .err__message {
      max-width: 46ch;
      font-size: var(--fs-sm);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }
  `,
})
export class ErrorStateComponent {
  readonly title = input('Chargement impossible');
  readonly message = input(
    "Les données n'ont pas pu être récupérées. Vérifiez votre connexion puis relancez la requête.",
  );
  readonly retry = output<void>();
}

/* -----------------------------------------------------------------------------
   Squelette de tableau — reprend la géométrie réelle des lignes
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-table-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk" role="status" aria-label="Chargement des données">
      @for (row of rows(); track $index) {
        <div class="sk__row" [style.animation-delay.ms]="$index * 45">
          @for (col of columns(); track $index) {
            <div class="skeleton skeleton--line" [style.width.%]="col"></div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .sk {
      display: flex;
      flex-direction: column;
    }

    .sk__row {
      display: grid;
      grid-template-columns: var(--template, repeat(7, 1fr));
      align-items: center;
      gap: var(--sp-4);
      padding: var(--sp-4);
      border-bottom: 1px solid var(--border-subtle);
      animation: fade-in var(--dur-base) var(--ease-out) both;
    }
  `,
  host: { '[style.--template]': 'template()' },
})
export class TableSkeletonComponent {
  readonly rowCount = input(8);
  /** Largeurs relatives des cellules, en pourcentage de leur colonne. */
  readonly columns = input<readonly number[]>([70, 45, 85, 60, 40, 55, 35]);

  /* `computed` plutôt que des méthodes : sans cela chaque cycle de rendu
     produisait de nouveaux tableaux, invalidant inutilement la boucle @for. */
  protected readonly rows = computed(() => Array.from({ length: this.rowCount() }));
  protected readonly template = computed(() => `repeat(${this.columns().length}, 1fr)`);
}
