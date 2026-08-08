import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';

const STORAGE_KEY = 'vigilance.sidebar';

/** Largeur en deçà de laquelle la navigation latérale bascule en superposition. */
const COMPACT_QUERY = '(max-width: 720px)';

/** Largeur en deçà de laquelle le rail se réduit d'office pour rendre la place. */
const NARROW_QUERY = '(max-width: 1080px)';

/** État de la coquille applicative, partagé entre le header et la sidebar. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly _sidebarCollapsed = signal(this.restore());
  private readonly _mobileNavOpen = signal(false);
  private readonly _paletteOpen = signal(false);
  private readonly _shortcutsOpen = signal(false);
  private readonly _compact = signal(false);
  private readonly _narrow = signal(false);

  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  readonly mobileNavOpen = this._mobileNavOpen.asReadonly();
  readonly paletteOpen = this._paletteOpen.asReadonly();
  readonly shortcutsOpen = this._shortcutsOpen.asReadonly();

  /** Vrai sur les écrans où la navigation ne tient plus à côté du contenu. */
  readonly compact = this._compact.asReadonly();

  /**
   * Repli effectif du rail — source unique pour la grille de la coquille et
   * pour le rendu de la sidebar.
   *
   * Les deux étaient auparavant décidés séparément : une requête média
   * réduisait la colonne à 68 px pendant que le composant continuait
   * d'afficher ses libellés, qui se retrouvaient rognés.
   */
  readonly railCollapsed = computed(() => {
    if (this._compact()) return false; // en superposition, le menu est déployé
    return this._narrow() || this._sidebarCollapsed();
  });

  /** Le repli est imposé par la largeur : le bouton de repli n'a plus de sens. */
  readonly railCollapseForced = computed(() => this._narrow() && !this._compact());

  constructor() {
    effect(() => {
      const collapsed = this._sidebarCollapsed();
      try {
        localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
      } catch {
        /* Préférence non persistée : sans conséquence sur la session. */
      }
    });

    /* Le suivi de la largeur passe par `matchMedia` plutôt que par un
       écouteur de redimensionnement : le navigateur ne notifie qu'aux
       franchissements de seuil, pas à chaque pixel. */
    this.watch(COMPACT_QUERY, (matches) => {
      this._compact.set(matches);
      /* En repassant sur grand écran, la superposition n'a plus lieu d'être. */
      if (!matches) this._mobileNavOpen.set(false);
    });

    this.watch(NARROW_QUERY, (matches) => this._narrow.set(matches));
  }

  /** Suit une requête média et libère l'écouteur à la destruction du service. */
  private watch(query: string, apply: (matches: boolean) => void): void {
    const media = window.matchMedia(query);
    apply(media.matches);

    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
  }

  /**
   * Action unique du bouton de navigation du header : sur grand écran elle
   * replie le rail, sur petit écran elle ouvre la navigation en superposition.
   */
  toggleNavigation(): void {
    if (this._compact()) this._mobileNavOpen.update((open) => !open);
    else this._sidebarCollapsed.update((collapsed) => !collapsed);
  }

  toggleSidebar(): void {
    this._sidebarCollapsed.update((collapsed) => !collapsed);
  }

  closeMobileNav(): void {
    this._mobileNavOpen.set(false);
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
