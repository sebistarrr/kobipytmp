import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * En-tête de page. Reste collé en haut de la zone de contenu au défilement,
 * afin que le titre et les actions principales restent accessibles dans les
 * listes longues.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ph" [attr.data-sticky]="sticky() || null">
      <div class="ph__row">
        <div class="ph__titles">
          @if (eyebrow()) {
            <p class="eyebrow">{{ eyebrow() }}</p>
          }
          <div class="ph__title-row">
            <h1 class="ph__title">{{ title() }}</h1>
            <ng-content select="[headerBadge]" />
          </div>
          @if (subtitle()) {
            <p class="ph__subtitle">{{ subtitle() }}</p>
          }
        </div>

        <div class="ph__actions">
          <ng-content select="[headerActions]" />
        </div>
      </div>

      <ng-content />
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .ph {
      padding: var(--sp-6) var(--sp-6) var(--sp-4);
      background: var(--bg-canvas);
      border-bottom: 1px solid var(--border-subtle);
    }

    .ph[data-sticky] {
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
      background: color-mix(in srgb, var(--bg-canvas) 88%, transparent);
      backdrop-filter: blur(12px);
    }

    .ph__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-6);
      flex-wrap: wrap;
    }

    .ph__titles {
      min-width: 0;
    }

    .ph__title-row {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      flex-wrap: wrap;
    }

    .ph__title {
      font-size: var(--fs-xl);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tighter);
      color: var(--text-primary);
    }

    .ph__subtitle {
      margin-top: var(--sp-1);
      font-size: var(--fs-sm);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
      max-width: 76ch;
    }

    .ph__actions {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex: none;
    }

    @media (max-width: 720px) {
      .ph {
        padding: var(--sp-4);
      }
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
  readonly sticky = input(false);
}
