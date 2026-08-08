import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'vigilance.theme';

/**
 * Bascule de thème. Le thème sombre est le défaut : les écrans
 * d'investigation sont consultés longuement, souvent en environnement peu
 * éclairé, et le contraste réduit limite la fatigue visuelle.
 *
 * La valeur initiale est déjà appliquée par un script inline dans index.html,
 * ce qui évite tout flash au chargement.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.restore());
  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const theme = this._theme();
      document.documentElement.dataset['theme'] = theme;
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* Stockage indisponible : le thème reste appliqué pour la session. */
      }
    });
  }

  toggle(): void {
    this._theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this._theme.set(theme);
  }

  private restore(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      /* Ignoré : on retombe sur le thème sombre. */
    }
    return 'dark';
  }
}
