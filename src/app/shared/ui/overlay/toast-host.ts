import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService, type ToastKind } from '../../../core/services/toast.service';
import { IconComponent, type IconName } from '../icon/icon';

/** Pile de notifications, montée une seule fois au niveau de l'AppShell. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="toasts" role="region" aria-live="polite" aria-label="Notifications">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [attr.data-kind]="toast.kind">
          <span class="toast__glyph">
            <app-icon [name]="glyph(toast.kind)" [size]="15" [strokeWidth]="2" />
          </span>

          <div class="toast__content">
            <p class="toast__title">{{ toast.title }}</p>
            @if (toast.detail) {
              <p class="toast__detail">{{ toast.detail }}</p>
            }
          </div>

          @if (toast.actionLabel) {
            <button type="button" class="toast__action" (click)="run(toast.id, toast.action)">
              {{ toast.actionLabel }}
            </button>
          }

          <button
            type="button"
            class="toast__close"
            (click)="toasts.dismiss(toast.id)"
            aria-label="Masquer la notification"
          >
            <app-icon name="x" [size]="13" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: var(--sp-5);
      bottom: var(--sp-5);
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      width: min(400px, calc(100vw - var(--sp-8)));
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
      border-radius: var(--r-lg);
      border: 1px solid var(--border-default);
      background: var(--bg-overlay);
      box-shadow: var(--shadow-lg);
      animation: fade-in-up var(--dur-base) var(--ease-out);
    }

    /* Filet de couleur à gauche : le statut se lit sans avoir à lire le texte. */
    .toast::before {
      content: '';
      position: absolute;
      left: 0;
      top: var(--sp-2);
      bottom: var(--sp-2);
      width: 2px;
      border-radius: var(--r-full);
      background: var(--tone);
    }

    .toast {
      position: relative;
      overflow: hidden;
      --tone: var(--neutral);
    }

    .toast[data-kind='success'] {
      --tone: var(--success);
    }
    .toast[data-kind='error'] {
      --tone: var(--critical);
    }
    .toast[data-kind='warning'] {
      --tone: var(--warning);
    }
    .toast[data-kind='info'] {
      --tone: var(--info);
    }

    .toast__glyph {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      flex: none;
      margin-top: 1px;
      border-radius: var(--r-sm);
      color: var(--tone);
      background: color-mix(in srgb, var(--tone) 14%, transparent);
    }

    .toast__content {
      flex: 1;
      min-width: 0;
    }

    .toast__title {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
      line-height: var(--lh-snug);
    }

    .toast__detail {
      margin-top: 2px;
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .toast__action {
      flex: none;
      align-self: center;
      padding: 4px var(--sp-2);
      border-radius: var(--r-sm);
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--accent-text);
      transition: background var(--dur-fast) var(--ease-out);
    }

    .toast__action:hover {
      background: var(--accent-soft);
    }

    .toast__close {
      flex: none;
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: var(--r-sm);
      color: var(--text-tertiary);
      transition:
        background var(--dur-fast) var(--ease-out),
        color var(--dur-fast) var(--ease-out);
    }

    .toast__close:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);

  protected glyph(kind: ToastKind): IconName {
    switch (kind) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'x-circle';
      case 'warning':
        return 'alert-triangle';
      case 'info':
        return 'info';
    }
  }

  protected run(id: number, action?: () => void): void {
    action?.();
    this.toasts.dismiss(id);
  }
}
