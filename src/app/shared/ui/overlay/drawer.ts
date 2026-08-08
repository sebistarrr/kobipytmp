import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { IconComponent } from '../icon/icon';

/**
 * Panneau latéral.
 *
 * Sert d'aperçu sans quitter la liste sur grand écran, et de conteneur pour
 * les colonnes de l'écran d'investigation sur tablette. Se ferme à la touche
 * Échap et au clic sur le voile.
 */
@Component({
  selector: 'app-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (open()) {
      <div class="drawer__scrim" (click)="close.emit()" aria-hidden="true"></div>

      <aside
        #panel
        class="drawer__panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        [attr.data-width]="width()"
        tabindex="-1"
        (keydown.escape)="close.emit()"
      >
        <header class="drawer__head">
          <div class="drawer__titles">
            <h2 class="drawer__title">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="drawer__subtitle">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            (click)="close.emit()"
            aria-label="Fermer le panneau"
          >
            <app-icon name="x" [size]="16" />
          </button>
        </header>

        <div class="drawer__body scroll-y">
          <ng-content />
        </div>

        <ng-content select="[drawerFooter]" />
      </aside>
    }
  `,
  styles: `
    .drawer__scrim {
      position: fixed;
      inset: 0;
      z-index: var(--z-drawer);
      background: var(--scrim);
      backdrop-filter: blur(2px);
      animation: fade-in var(--dur-fast) var(--ease-out);
    }

    .drawer__panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: calc(var(--z-drawer) + 1);
      width: min(520px, 100vw);
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-default);
      box-shadow: var(--shadow-xl);
      animation: slide-in-right var(--dur-base) var(--ease-out);
    }

    .drawer__panel[data-width='wide'] {
      width: min(760px, 100vw);
    }
    .drawer__panel[data-width='narrow'] {
      width: min(400px, 100vw);
    }

    .drawer__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-4);
      padding: var(--sp-4) var(--sp-5);
      border-bottom: 1px solid var(--border-subtle);
      flex: none;
    }

    .drawer__titles {
      min-width: 0;
    }

    .drawer__title {
      font-size: var(--fs-md);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .drawer__subtitle {
      margin-top: 2px;
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
    }

    .drawer__body {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class DrawerComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly width = input<'narrow' | 'default' | 'wide'>('default');
  readonly close = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly host = inject(ElementRef);

  constructor() {
    /* Le focus entre dans le panneau à l'ouverture pour que Échap fonctionne
       immédiatement et que la navigation clavier ne reste pas derrière le voile. */
    effect(() => {
      if (!this.open()) return;
      queueMicrotask(() => this.panel()?.nativeElement.focus());
    });

    /* Échap depuis n'importe où dans le panneau, y compris le contenu projeté. */
    effect((onCleanup) => {
      if (!this.open()) return;
      const handler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          this.close.emit();
        }
      };
      const element = this.host.nativeElement as HTMLElement;
      element.addEventListener('keydown', handler);
      onCleanup(() => element.removeEventListener('keydown', handler));
    });
  }
}
