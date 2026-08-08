import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { CommandPaletteComponent } from '../command-palette/command-palette';
import { HeaderComponent } from '../header/header';
import { LayoutService } from '../layout.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { ModalComponent } from '../../shared/ui/overlay/modal';
import { ToastHostComponent } from '../../shared/ui/overlay/toast-host';

interface Shortcut {
  readonly keys: readonly string[];
  readonly label: string;
}

const SHORTCUT_GROUPS: readonly { title: string; items: readonly Shortcut[] }[] = [
  {
    title: 'Général',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Ouvrir la recherche globale' },
      { keys: ['?'], label: 'Afficher les raccourcis' },
      { keys: ['Échap'], label: 'Fermer le panneau ou la boîte de dialogue' },
      { keys: ['Ctrl', 'B'], label: 'Réduire ou déployer le menu' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { keys: ['G', 'D'], label: 'Aller au tableau de bord' },
      { keys: ['G', 'A'], label: 'Aller aux alertes à traiter' },
      { keys: ['G', 'M'], label: 'Aller à mes alertes' },
      { keys: ['G', 'T'], label: 'Aller aux alertes traitées' },
      { keys: ['G', 'R'], label: 'Aller au reporting' },
    ],
  },
  {
    title: 'Investigation',
    items: [
      { keys: ['J'], label: 'Alerte suivante dans la file' },
      { keys: ['K'], label: 'Alerte précédente dans la file' },
      { keys: ['A'], label: "S'affecter l'alerte" },
      { keys: ['C'], label: 'Ajouter un commentaire' },
      { keys: ['D'], label: 'Ouvrir le panneau de décision' },
    ],
  },
];

/**
 * Coquille applicative : navigation, header, zone de contenu, surcouches.
 *
 * Elle porte aussi les raccourcis globaux. Les analystes traitent des dizaines
 * de dossiers par jour ; pouvoir naviguer sans quitter le clavier fait une
 * différence réelle sur le temps de traitement.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    CommandPaletteComponent,
    ToastHostComponent,
    ModalComponent,
  ],
  template: `
    <a class="shell__skip" href="#contenu">Aller au contenu principal</a>

    <div
      class="shell"
      [attr.data-collapsed]="layout.railCollapsed() || null"
      [attr.data-nav-open]="layout.mobileNavOpen() || null"
    >
      @if (layout.mobileNavOpen()) {
        <div class="shell__nav-scrim" (click)="layout.closeMobileNav()" aria-hidden="true"></div>
      }

      <aside class="shell__nav" [attr.inert]="navHidden() ? '' : null">
        <app-sidebar />
      </aside>

      <div class="shell__main">
        <app-header />
        <main class="shell__content scroll-y" id="contenu" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-command-palette />
    <app-toast-host />

    <app-modal
      [open]="layout.shortcutsOpen()"
      title="Raccourcis clavier"
      subtitle="Conçus pour enchaîner les dossiers sans quitter le clavier."
      size="lg"
      (close)="layout.closeShortcuts()"
    >
      <div class="sc">
        @for (group of shortcutGroups; track group.title) {
          <section class="sc__group">
            <h3 class="sc__title eyebrow">{{ group.title }}</h3>
            <ul>
              @for (item of group.items; track item.label) {
                <li class="sc__row">
                  <span class="sc__label">{{ item.label }}</span>
                  <span class="sc__keys">
                    @for (key of item.keys; track key) {
                      <span class="kbd">{{ key }}</span>
                    }
                  </span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </app-modal>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
      height: 100dvh;
    }

    /* Lien d'évitement : premier élément tabulable de la page, révélé au focus. */
    .shell__skip {
      position: fixed;
      top: var(--sp-2);
      left: var(--sp-2);
      z-index: calc(var(--z-toast) + 1);
      padding: var(--sp-2) var(--sp-4);
      border-radius: var(--r-md);
      background: var(--accent);
      color: #fff;
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      box-shadow: var(--shadow-lg);
      transform: translateY(-200%);
      transition: transform var(--dur-fast) var(--ease-out);
    }

    .shell__skip:focus-visible {
      transform: translateY(0);
      outline-offset: 3px;
    }

    .shell__nav-scrim {
      position: fixed;
      inset: 0;
      z-index: var(--z-drawer);
      background: var(--scrim);
      backdrop-filter: blur(2px);
      animation: fade-in var(--dur-fast) var(--ease-out);
    }

    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
      height: 100%;
      transition: grid-template-columns var(--dur-base) var(--ease-out);
    }

    .shell[data-collapsed] {
      grid-template-columns: var(--sidebar-w-collapsed) minmax(0, 1fr);
    }

    .shell__nav {
      min-width: 0;
      height: 100%;
    }

    .shell__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100%;
    }

    .shell__content {
      flex: 1;
      min-height: 0;
      background: var(--bg-canvas);
    }

    /* Transition de route : le composant routé étant recréé à chaque
       navigation, l'animation se rejoue sans machinerie supplémentaire. */
    .shell__content > * {
      display: block;
      animation: fade-in var(--dur-base) var(--ease-out);
    }

    /* --- Raccourcis --- */
    .sc {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--sp-6);
    }

    .sc__title {
      margin-bottom: var(--sp-2);
    }

    .sc__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-4);
      padding: var(--sp-2) 0;
      border-bottom: 1px solid var(--border-subtle);
    }

    .sc__row:last-child {
      border-bottom: none;
    }

    .sc__label {
      font-size: var(--fs-xs);
      color: var(--text-secondary);
    }

    .sc__keys {
      display: flex;
      gap: 3px;
      flex: none;
    }

    /* Sous 720 px, la navigation quitte la grille et se superpose au contenu.
       Elle reste atteignable par le bouton du header, ce qui évite de laisser
       l'application sans navigation sur téléphone. */
    @media (max-width: 720px) {
      .shell,
      .shell[data-collapsed] {
        grid-template-columns: 0 minmax(0, 1fr);
      }

      .shell__nav {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: calc(var(--z-drawer) + 1);
        width: var(--sidebar-w);
        box-shadow: var(--shadow-xl);
        transform: translateX(-100%);
        transition: transform var(--dur-base) var(--ease-out);
        visibility: hidden;
      }

      .shell[data-nav-open] .shell__nav {
        transform: translateX(0);
        visibility: visible;
      }
    }
  `,
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class AppShellComponent {
  protected readonly layout = inject(LayoutService);
  private readonly router = inject(Router);

  protected readonly shortcutGroups = SHORTCUT_GROUPS;

  /**
   * Sur petit écran, la navigation repliée est retirée de l'ordre de
   * tabulation : `visibility: hidden` suffit au rendu, mais `inert` évite en
   * plus qu'un lecteur d'écran ne parcoure un menu invisible.
   */
  protected readonly navHidden = computed(() => this.layout.compact() && !this.layout.mobileNavOpen());

  constructor() {
    /* Un changement d'écran referme la navigation superposée : sans cela elle
       resterait ouverte par-dessus la page que l'on vient d'ouvrir. */
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.layout.closeMobileNav());
  }

  /** Première touche d'une séquence « g puis … », expirée après deux secondes. */
  private readonly pendingChord = signal<string | null>(null);
  private chordTimer: ReturnType<typeof setTimeout> | undefined;

  protected onKeydown(event: KeyboardEvent): void {
    /* Ne jamais capturer une frappe destinée à un champ de saisie. */
    const target = event.target as HTMLElement | null;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable === true;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.layout.togglePalette();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      this.layout.toggleNavigation();
      return;
    }

    if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === '?') {
      event.preventDefault();
      this.layout.toggleShortcuts();
      return;
    }

    const key = event.key.toLowerCase();

    if (this.pendingChord() === 'g') {
      const destination = this.chordTarget(key);
      this.clearChord();
      if (destination) {
        event.preventDefault();
        void this.router.navigate([destination]);
      }
      return;
    }

    if (key === 'g') {
      this.pendingChord.set('g');
      clearTimeout(this.chordTimer);
      this.chordTimer = setTimeout(() => this.clearChord(), 2000);
    }
  }

  private chordTarget(key: string): string | null {
    switch (key) {
      case 'd':
        return '/tableau-de-bord';
      case 'a':
        return '/alertes/a-traiter';
      case 'm':
        return '/alertes/mes-alertes';
      case 't':
        return '/alertes/traitees';
      case 'r':
        return '/reporting';
      default:
        return null;
    }
  }

  private clearChord(): void {
    clearTimeout(this.chordTimer);
    this.pendingChord.set(null);
  }
}
