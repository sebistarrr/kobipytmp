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
 * Boîte de dialogue modale.
 *
 * Coquille générique : elle gère le voile, le focus, la touche Échap et la
 * mise en page. Le contenu et les actions sont projetés par l'appelant, ce qui
 * permet de l'utiliser aussi bien pour une confirmation simple que pour la
 * récapitulation d'une décision réglementaire.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (open()) {
      <div class="modal__scrim" (click)="dismissOnBackdrop() && close.emit()" aria-hidden="true"></div>

      <div class="modal__wrap">
        <div
          #panel
          class="modal__panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          [attr.data-size]="size()"
          tabindex="-1"
        >
          <header class="modal__head">
            @if (tone() !== 'neutral') {
              <span class="modal__glyph" [attr.data-tone]="tone()">
                <app-icon [name]="tone() === 'danger' ? 'alert-triangle' : 'shield-check'" [size]="18" />
              </span>
            }
            <div class="modal__titles">
              <h2 class="modal__title">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="modal__subtitle">{{ subtitle() }}</p>
              }
            </div>
            <button
              type="button"
              class="btn btn--ghost btn--icon btn--sm"
              (click)="close.emit()"
              aria-label="Fermer"
            >
              <app-icon name="x" [size]="16" />
            </button>
          </header>

          <div class="modal__body scroll-y">
            <ng-content />
          </div>

          <footer class="modal__foot">
            <ng-content select="[modalFooter]" />
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    .modal__scrim {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal);
      background: var(--scrim);
      backdrop-filter: blur(3px);
      animation: fade-in var(--dur-fast) var(--ease-out);
    }

    .modal__wrap {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-modal) + 1);
      display: grid;
      place-items: center;
      padding: var(--sp-6);
      pointer-events: none;
    }

    .modal__panel {
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      width: min(520px, 100%);
      max-height: min(84vh, 760px);
      background: var(--bg-overlay);
      border: 1px solid var(--border-default);
      border-radius: var(--r-xl);
      box-shadow: var(--shadow-xl);
      animation: scale-in var(--dur-base) var(--ease-out);
      overflow: hidden;
    }

    .modal__panel[data-size='lg'] {
      width: min(680px, 100%);
    }
    .modal__panel[data-size='xl'] {
      width: min(860px, 100%);
    }

    .modal__head {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-3);
      padding: var(--sp-5) var(--sp-5) var(--sp-4);
      flex: none;
    }

    .modal__glyph {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      flex: none;
      border-radius: var(--r-md);
      border: 1px solid transparent;
    }

    .modal__glyph[data-tone='danger'] {
      background: var(--critical-soft);
      border-color: var(--critical-border);
      color: var(--critical-text);
    }

    .modal__glyph[data-tone='success'] {
      background: var(--success-soft);
      border-color: var(--success-border);
      color: var(--success-text);
    }

    .modal__glyph[data-tone='info'] {
      background: var(--info-soft);
      border-color: var(--info-border);
      color: var(--info-text);
    }

    .modal__titles {
      flex: 1;
      min-width: 0;
    }

    .modal__title {
      font-size: var(--fs-md);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      line-height: var(--lh-snug);
    }

    .modal__subtitle {
      margin-top: 3px;
      font-size: var(--fs-sm);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .modal__body {
      flex: 1;
      min-height: 0;
      padding: 0 var(--sp-5) var(--sp-5);
    }

    .modal__foot {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--sp-2);
      padding: var(--sp-4) var(--sp-5);
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-sunken);
      flex: none;
    }

    .modal__foot:empty {
      display: none;
    }
  `,
})
export class ModalComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly tone = input<'neutral' | 'danger' | 'success' | 'info'>('neutral');
  readonly size = input<'default' | 'lg' | 'xl'>('default');
  readonly dismissOnBackdrop = input(true);
  readonly close = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly host = inject(ElementRef);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      queueMicrotask(() => this.panel()?.nativeElement.focus());
    });

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
