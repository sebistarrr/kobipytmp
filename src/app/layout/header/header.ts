import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AlertStore } from '../../core/state/alert-store';
import { ThemeService } from '../../core/services/theme.service';
import { USER_LEVEL_META } from '../../core/models';
import { AvatarComponent } from '../../shared/ui/avatar/avatar';
import { IconComponent } from '../../shared/ui/icon/icon';
import { LevelBadgeComponent } from '../../shared/ui/badges/badges';
import { AgePipe } from '../../shared/pipes/format.pipes';
import { LayoutService } from '../layout.service';

type OpenMenu = 'subsidiary' | 'notifications' | 'user' | null;

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, AvatarComponent, LevelBadgeComponent, AgePipe],
  template: `
    <header class="hd">
      <button
        type="button"
        class="btn btn--ghost btn--icon"
        (click)="layout.toggleSidebar()"
        aria-label="Afficher ou masquer le menu"
      >
        <app-icon name="panel-left" [size]="17" />
      </button>

      <!-- Contexte de filiale -->
      <div class="hd__menu-anchor">
        <button
          type="button"
          class="hd__context"
          (click)="toggle('subsidiary')"
          [attr.aria-expanded]="open() === 'subsidiary'"
        >
          <span class="hd__context-mark"><app-icon name="building" [size]="14" /></span>
          <span class="hd__context-body">
            <span class="hd__context-label">{{ subsidiary().code }}</span>
            <span class="hd__context-name truncate">{{ subsidiary().name }}</span>
          </span>
          <app-icon name="chevron-down" [size]="14" />
        </button>

        @if (open() === 'subsidiary') {
          <div class="menu menu--wide anim-scale-in">
            <p class="menu__title">Périmètre de travail</p>
            @for (item of subsidiaries(); track item.id) {
              <button
                type="button"
                class="menu__item"
                [class.is-active]="item.id === subsidiary().id"
                (click)="selectSubsidiary(item.id)"
              >
                <span class="menu__item-main">
                  <span class="menu__item-label">{{ item.name }}</span>
                  <span class="menu__item-meta">{{ item.code }} · {{ item.country }} · {{ item.regulator }}</span>
                </span>
                @if (item.id === subsidiary().id) {
                  <app-icon name="check" [size]="15" />
                }
              </button>
            }
            @if (subsidiaries().length === 1) {
              <p class="menu__foot">
                Votre habilitation est limitée à cette filiale. Le changement de périmètre relève de
                l'administration groupe.
              </p>
            }
          </div>
        }
      </div>

      <!-- Recherche globale -->
      <button type="button" class="hd__search" (click)="layout.openPalette()">
        <app-icon name="search" [size]="15" />
        <span class="hd__search-text">Rechercher une alerte, un client, une référence…</span>
        <span class="hd__search-keys">
          <span class="kbd">Ctrl</span><span class="kbd">K</span>
        </span>
      </button>

      <div class="hd__actions">
        <button
          type="button"
          class="btn btn--ghost btn--icon"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.theme() === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'"
        >
          <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="16" />
        </button>

        <button
          type="button"
          class="btn btn--ghost btn--icon"
          (click)="layout.toggleShortcuts()"
          aria-label="Raccourcis clavier"
        >
          <app-icon name="command" [size]="16" />
        </button>

        <!-- Notifications -->
        <div class="hd__menu-anchor">
          <button
            type="button"
            class="btn btn--ghost btn--icon hd__bell"
            (click)="toggle('notifications')"
            [attr.aria-expanded]="open() === 'notifications'"
            aria-label="Notifications"
          >
            <app-icon name="bell" [size]="16" />
            @if (notifications().length > 0) {
              <span class="hd__bell-dot"></span>
            }
          </button>

          @if (open() === 'notifications') {
            <div class="menu menu--wide anim-scale-in">
              <p class="menu__title">
                Notifications
                <span class="count-pill">{{ notifications().length }}</span>
              </p>

              @for (item of notifications(); track item.id) {
                <a class="menu__item" [routerLink]="['/alertes', item.id]" (click)="close()">
                  <span class="menu__item-main">
                    <span class="menu__item-label">{{ item.title }}</span>
                    <span class="menu__item-meta">{{ item.detail }} · {{ item.at | age }}</span>
                  </span>
                  <span class="menu__pip" [attr.data-tone]="item.tone"></span>
                </a>
              } @empty {
                <p class="menu__foot">Aucune notification en attente sur votre périmètre.</p>
              }
            </div>
          }
        </div>

        <div class="divider--v"></div>

        <!-- Profil -->
        <div class="hd__menu-anchor">
          <button
            type="button"
            class="hd__user"
            (click)="toggle('user')"
            [attr.aria-expanded]="open() === 'user'"
          >
            <app-avatar [name]="auth.displayName()" [hue]="auth.currentUser().avatarHue" size="sm" />
            <span class="hd__user-body">
              <span class="hd__user-name">{{ auth.displayName() }}</span>
              <span class="hd__user-role">{{ auth.levelMeta().shortLabel }}</span>
            </span>
            <app-icon name="chevron-down" [size]="14" />
          </button>

          @if (open() === 'user') {
            <div class="menu menu--wide anim-scale-in">
              <div class="menu__profile">
                <app-avatar [name]="auth.displayName()" [hue]="auth.currentUser().avatarHue" size="lg" />
                <div>
                  <p class="menu__profile-name">{{ auth.displayName() }}</p>
                  <p class="menu__profile-mail">{{ auth.currentUser().email }}</p>
                  <div class="menu__profile-badge">
                    <app-level-badge [level]="auth.currentUser().level" />
                  </div>
                </div>
              </div>

              <p class="menu__title">Basculer de compte</p>
              <p class="menu__hint">
                Prototype : la bascule permet de parcourir l'application sous chaque niveau
                d'habilitation.
              </p>

              @for (user of switchableUsers(); track user.id) {
                <button
                  type="button"
                  class="menu__item"
                  [class.is-active]="user.id === auth.currentUser().id"
                  (click)="switchUser(user.id)"
                >
                  <app-avatar [name]="user.name" [hue]="user.hue" size="xs" />
                  <span class="menu__item-main">
                    <span class="menu__item-label">{{ user.name }}</span>
                    <span class="menu__item-meta">{{ user.role }}</span>
                  </span>
                  @if (user.id === auth.currentUser().id) {
                    <app-icon name="check" [size]="15" />
                  }
                </button>
              }
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .hd {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      height: var(--header-h);
      padding: 0 var(--sp-4);
      background: color-mix(in srgb, var(--bg-canvas) 82%, transparent);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border-subtle);
    }

    .hd__menu-anchor {
      position: relative;
      display: flex;
    }

    /* --- Sélecteur de filiale --- */
    .hd__context {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      height: 36px;
      padding: 0 var(--sp-2) 0 var(--sp-2);
      border-radius: var(--r-md);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      color: var(--text-secondary);
      max-width: 260px;
      transition:
        border-color var(--dur-fast) var(--ease-out),
        background var(--dur-fast) var(--ease-out);
    }

    .hd__context:hover {
      border-color: var(--border-default);
      background: var(--bg-raised);
    }

    .hd__context-mark {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      flex: none;
      border-radius: var(--r-sm);
      background: var(--accent-soft);
      color: var(--accent-text);
    }

    .hd__context-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 0;
      line-height: 1.25;
    }

    .hd__context-label {
      font-size: 10px;
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-wide);
      color: var(--text-tertiary);
    }

    .hd__context-name {
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
      max-width: 170px;
    }

    /* --- Recherche --- */
    .hd__search {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      height: 36px;
      max-width: 560px;
      margin: 0 auto;
      padding: 0 var(--sp-2) 0 var(--sp-3);
      border-radius: var(--r-md);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      color: var(--text-tertiary);
      transition:
        border-color var(--dur-fast) var(--ease-out),
        background var(--dur-fast) var(--ease-out);
    }

    .hd__search:hover {
      border-color: var(--border-default);
      background: var(--bg-raised);
    }

    .hd__search-text {
      flex: 1;
      text-align: left;
      font-size: var(--fs-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hd__search-keys {
      display: flex;
      gap: 3px;
      flex: none;
    }

    .hd__actions {
      display: flex;
      align-items: center;
      gap: var(--sp-1);
      flex: none;
    }

    .hd__bell {
      position: relative;
    }

    .hd__bell-dot {
      position: absolute;
      top: 7px;
      right: 8px;
      width: 6px;
      height: 6px;
      border-radius: var(--r-full);
      background: var(--critical);
      border: 1.5px solid var(--bg-canvas);
    }

    /* --- Profil --- */
    .hd__user {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      height: 36px;
      padding: 0 var(--sp-2);
      border-radius: var(--r-md);
      transition: background var(--dur-fast) var(--ease-out);
    }

    .hd__user:hover {
      background: var(--bg-hover);
    }

    .hd__user-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.25;
    }

    .hd__user-name {
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
    }

    .hd__user-role {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    /* --- Menus déroulants --- */
    .menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: var(--z-header);
      min-width: 240px;
      padding: var(--sp-2);
      border-radius: var(--r-lg);
      border: 1px solid var(--border-default);
      background: var(--bg-overlay);
      box-shadow: var(--shadow-lg);
      transform-origin: top right;
    }

    .menu--wide {
      min-width: 320px;
      max-width: 380px;
    }

    .hd__menu-anchor:first-of-type .menu {
      left: 0;
      right: auto;
      transform-origin: top left;
    }

    .menu__title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
      padding: var(--sp-2) var(--sp-2) var(--sp-1);
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-widest);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .menu__hint {
      padding: 0 var(--sp-2) var(--sp-2);
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .menu__item {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      width: 100%;
      padding: var(--sp-2);
      border-radius: var(--r-sm);
      text-align: left;
      color: var(--text-secondary);
      transition: background var(--dur-fast) var(--ease-out);
    }

    .menu__item:hover {
      background: var(--bg-hover);
    }

    .menu__item.is-active {
      background: var(--accent-soft);
      color: var(--accent-text);
    }

    .menu__item-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .menu__item-label {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
      line-height: var(--lh-snug);
    }

    .menu__item.is-active .menu__item-label {
      color: var(--accent-text);
    }

    .menu__item-meta {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .menu__pip {
      width: 6px;
      height: 6px;
      flex: none;
      border-radius: var(--r-full);
      background: var(--neutral);
    }

    .menu__pip[data-tone='critical'] {
      background: var(--critical);
    }
    .menu__pip[data-tone='warning'] {
      background: var(--warning);
    }
    .menu__pip[data-tone='accent'] {
      background: var(--accent);
    }

    .menu__foot {
      padding: var(--sp-2);
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .menu__profile {
      display: flex;
      gap: var(--sp-3);
      padding: var(--sp-2);
      margin-bottom: var(--sp-2);
      border-bottom: 1px solid var(--border-subtle);
    }

    .menu__profile-name {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .menu__profile-mail {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      margin-bottom: var(--sp-2);
    }

    .menu__profile-badge {
      display: flex;
    }

    @media (max-width: 1080px) {
      .hd__search-text {
        display: none;
      }
      .hd__search {
        flex: none;
        width: 36px;
        justify-content: center;
        padding: 0;
      }
      .hd__search-keys {
        display: none;
      }
      .hd__user-body {
        display: none;
      }
    }

    @media (max-width: 720px) {
      .hd__context-body {
        display: none;
      }
    }
  `,
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class HeaderComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly store = inject(AlertStore);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal<OpenMenu>(null);

  protected readonly subsidiary = this.auth.activeSubsidiary;
  protected readonly subsidiaries = this.auth.availableSubsidiaries;

  protected readonly switchableUsers = computed(() =>
    this.auth.allUsers
      .filter((user) => user.active)
      .map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: `${USER_LEVEL_META[user.level].label} · ${user.jobTitle}`,
        hue: user.avatarHue,
      })),
  );

  /** Les alertes critiques non affectées et les alertes hors délai remontent ici. */
  protected readonly notifications = computed(() => {
    const critical = this.store
      .alerts()
      .filter((alert) => alert.priority === 'CRITICAL' && alert.status === 'TO_PROCESS')
      .slice(0, 4)
      .map((alert) => ({
        id: alert.id,
        title: `${alert.reference} — ${alert.client.firstName} ${alert.client.lastName}`,
        detail: `Alerte critique non affectée · score ${alert.match.score} %`,
        at: alert.generatedAt,
        tone: 'critical' as const,
      }));

    const reopened = this.store
      .alerts()
      .filter((alert) => alert.status === 'REOPENED')
      .slice(0, 2)
      .map((alert) => ({
        id: alert.id,
        title: `${alert.reference} — alerte rouverte`,
        detail: 'Réexamen requis à la suite d’un élément nouveau',
        at: alert.lastActionAt,
        tone: 'warning' as const,
      }));

    return [...reopened, ...critical];
  });

  protected toggle(menu: Exclude<OpenMenu, null>): void {
    this.open.update((current) => (current === menu ? null : menu));
  }

  protected close(): void {
    this.open.set(null);
  }

  protected selectSubsidiary(id: string): void {
    this.auth.selectSubsidiary(id);
    this.close();
  }

  protected switchUser(id: string): void {
    this.auth.signInAs(id);
    this.close();
  }

  /** Ferme les menus dès qu'un clic se produit en dehors du header. */
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() === null) return;
    const target = event.target as Node;
    if (!(this.host.nativeElement as HTMLElement).contains(target)) {
      this.close();
    }
  }
}
