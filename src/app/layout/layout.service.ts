import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'vigilance.sidebar';

/** État de la coquille applicative, partagé entre le header et la sidebar. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly _sidebarCollapsed = signal(this.restore());
  private readonly _paletteOpen = signal(false);
  private readonly _shortcutsOpen = signal(false);

  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly paletteOpen = this._paletteOpen.asReadonly();
  readonly shortcutsOpen = this._shortcutsOpen.asReadonly();

  constructor() {
    effect(() => {
      const collapsed = this._sidebarCollapsed();
      try {
        localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
      } catch {
        /* Préférence non persistée : sans conséquence sur la session. */
      }
    });
  }

  toggleSidebar(): void {
    this._sidebarCollapsed.update((collapsed) => !collapsed);
  }

  collapseSidebar(collapsed: boolean): void {
    this._sidebarCollapsed.set(collapsed);
  }

  openPalette(): void {
    this._paletteOpen.set(true);
  }

  closePalette(): void {
    this._paletteOpen.set(false);
  }

  togglePalette(): void {
    this._paletteOpen.update((open) => !open);
  }

  toggleShortcuts(): void {
    this._shortcutsOpen.update((open) => !open);
  }

  closeShortcuts(): void {
    this._shortcutsOpen.set(false);
  }

  private restore(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
