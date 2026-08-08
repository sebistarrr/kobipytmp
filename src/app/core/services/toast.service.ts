import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  readonly id: number;
  readonly kind: ToastKind;
  readonly title: string;
  readonly detail?: string;
  /** Libellé d'une action facultative, par exemple « Annuler » ou « Ouvrir ». */
  readonly actionLabel?: string;
  readonly action?: () => void;
}

const DEFAULT_DURATION = 4200;

/** File de notifications éphémères, affichée par `ToastHost`. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly _toasts = signal<readonly Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(toast: Omit<Toast, 'id'>, duration = DEFAULT_DURATION): number {
    const id = ++this.sequence;
    this._toasts.update((list) => [...list, { ...toast, id }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(title: string, detail?: string): number {
    return this.show({ kind: 'success', title, detail });
  }

  error(title: string, detail?: string): number {
    return this.show({ kind: 'error', title, detail }, 7000);
  }

  info(title: string, detail?: string): number {
    return this.show({ kind: 'info', title, detail });
  }

  warning(title: string, detail?: string): number {
    return this.show({ kind: 'warning', title, detail }, 6000);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
