import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AlertStore } from '../../core/state/alert-store';
import { IconComponent, type IconName } from '../../shared/ui/icon/icon';
import { LayoutService } from '../layout.service';

interface NavEntry {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  readonly badge?: number;
  readonly tone?: 'critical' | 'accent';
  readonly exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav class="sb" [attr.data-collapsed]="collapsed() || null" aria-label="Navigation principale">
      <div class="sb__brand">
        <span class="sb__mark" aria-hidden="true">
          <app-icon name="shield-check" [size]="17" [strokeWidth]="1.9" />
        </span>
        @if (!collapsed()) {
          <span class="sb__wordmark">
            <span class="sb__name">Vigilance</span>
            <span class="sb__tag">Screening LCB-FT</span>
          </span>
        }
      </div>

      <div class="sb__section">
        @if (!collapsed()) {
          <p class="sb__section-title eyebrow">Pilotage</p>
        }
        @for (entry of primaryNav(); track entry.path) {
          <a
            class="sb__item"
            [routerLink]="entry.path"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: entry.exact ?? false }"
            [attr.title]="collapsed() ? entry.label : null"
          >
            <span class="sb__icon"><app-icon [name]="entry.icon" [size]="17" /></span>
            @if (!collapsed()) {
              <span class="sb__label truncate">{{ entry.label }}</span>
              @if (entry.badge) {
                <span class="count-pill" [class.count-pill--critical]="entry.tone === 'critical'">
                  {{ entry.badge }}
                </span>
              }
            } @else if (entry.badge) {
              <span class="sb__pip" [attr.data-tone]="entry.tone ?? 'accent'"></span>
            }
          </a>
        }
      </div>

      @if (secondaryNav().length > 0) {
        <div class="sb__section">
          @if (!collapsed()) {
            <p class="sb__section-title eyebrow">Supervision</p>
          }
          @for (entry of secondaryNav(); track entry.path) {
            <a
              class="sb__item"
              [routerLink]="entry.path"
              routerLinkActive="is-active"
              [attr.title]="collapsed() ? entry.label : null"
            >
              <span class="sb__icon"><app-icon [name]="entry.icon" [size]="17" /></span>
              @if (!collapsed()) {
                <span class="sb__label truncate">{{ entry.label }}</span>
              }
            </a>
          }
        </div>
      }

      <div class="sb__spacer"></div>

      @if (!collapsed() && overdue() > 0) {
        <div class="sb__alert anim-fade-in">
          <app-icon name="alert-triangle" [size]="14" />
          <div>
            <p class="sb__alert-title">{{ overdue() }} alerte{{ overdue() > 1 ? 's' : '' }} hors délai</p>
            <p class="sb__alert-text">Délai de traitement dépassé au regard de la priorité.</p>
          </div>
        </div>
      }

      <button
        type="button"
        class="sb__collapse"
        (click)="layout.toggleSidebar()"
        [attr.aria-label]="collapsed() ? 'Déployer le menu' : 'Réduire le menu'"
      >
        <app-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="15" />
        @if (!collapsed()) {
          <span>Réduire</span>
        }
      </button>
    </nav>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .sb {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--sp-3);
      gap: var(--sp-1);
      background: var(--bg-sunken);
      border-right: 1px solid var(--border-subtle);
      overflow: hidden;
    }

    /* --- Marque --- */
    .sb__brand {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      height: calc(var(--header-h) - var(--sp-3));
      padding: 0 var(--sp-2);
      margin-bottom: var(--sp-2);
      flex: none;
    }

    .sb__mark {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      flex: none;
      border-radius: var(--r-md);
      background: linear-gradient(140deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #7c3aed));
      color: #fff;
      box-shadow: var(--shadow-sm);
    }

    .sb__wordmark {
      display: flex;
      flex-direction: column;
      min-width: 0;
      animation: fade-in var(--dur-base) var(--ease-out);
    }

    .sb__name {
      font-size: var(--fs-base);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tighter);
      color: var(--text-primary);
      line-height: 1.2;
    }

    .sb__tag {
      font-size: 10px;
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    /* --- Sections --- */
    .sb__section {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .sb__section + .sb__section {
      margin-top: var(--sp-4);
    }

    .sb__section-title {
      padding: 0 var(--sp-2);
      margin-bottom: var(--sp-2);
    }

    .sb__item {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      height: 36px;
      padding: 0 var(--sp-2);
      border-radius: var(--r-md);
      color: var(--text-secondary);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      transition:
        background var(--dur-fast) var(--ease-out),
        color var(--dur-fast) var(--ease-out);
    }

    .sb__item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .sb__item.is-active {
      background: var(--accent-soft);
      color: var(--accent-text);
    }

    /* Filet actif à gauche : repère de position stable même replié. */
    .sb__item.is-active::before {
      content: '';
      position: absolute;
      left: calc(var(--sp-3) * -1);
      top: 50%;
      transform: translateY(-50%);
      width: 2px;
      height: 18px;
      border-radius: 0 var(--r-full) var(--r-full) 0;
      background: var(--accent);
    }

    .sb__icon {
      display: grid;
      place-items: center;
      width: 20px;
      flex: none;
    }

    .sb__label {
      flex: 1;
    }

    .sb__pip {
      position: absolute;
      top: 7px;
      right: 7px;
      width: 6px;
      height: 6px;
      border-radius: var(--r-full);
      background: var(--accent);
      border: 1.5px solid var(--bg-sunken);
    }

    .sb__pip[data-tone='critical'] {
      background: var(--critical);
    }

    .sb__spacer {
      flex: 1;
      min-height: var(--sp-4);
    }

    /* --- Encart hors délai --- */
    .sb__alert {
      display: flex;
      gap: var(--sp-2);
      padding: var(--sp-3);
      margin-bottom: var(--sp-2);
      border-radius: var(--r-md);
      background: var(--critical-soft);
      border: 1px solid var(--critical-border);
      color: var(--critical-text);
    }

    .sb__alert app-icon {
      margin-top: 1px;
    }

    .sb__alert-title {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      line-height: var(--lh-snug);
    }

    .sb__alert-text {
      margin-top: 2px;
      font-size: 11px;
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    /* --- Bouton de repli --- */
    .sb__collapse {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      height: 32px;
      padding: 0 var(--sp-2);
      border-radius: var(--r-md);
      color: var(--text-tertiary);
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      transition:
        background var(--dur-fast) var(--ease-out),
        color var(--dur-fast) var(--ease-out);
      flex: none;
    }

    .sb__collapse:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .sb[data-collapsed] .sb__collapse {
      justify-content: center;
    }
  `,
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(AlertStore);

  protected readonly collapsed = this.layout.sidebarCollapsed;
  protected readonly overdue = computed(() => this.store.overdueAlerts().length);

  protected readonly primaryNav = computed<NavEntry[]>(() => {
    const toProcess = this.store.alerts().filter((alert) => alert.status === 'TO_PROCESS').length;
    const mine = this.store.myAlerts().length;

    return [
      { path: '/tableau-de-bord', label: 'Tableau de bord', icon: 'dashboard' },
      {
        path: '/alertes/a-traiter',
        label: 'Alertes à traiter',
        icon: 'inbox',
        badge: toProcess,
        tone: 'critical',
      },
      { path: '/alertes/mes-alertes', label: 'Mes alertes', icon: 'user-check', badge: mine, tone: 'accent' },
      { path: '/alertes/traitees', label: 'Alertes traitées', icon: 'archive' },
    ];
  });

  protected readonly secondaryNav = computed<NavEntry[]>(() => {
    const entries: NavEntry[] = [];
    if (this.auth.has('reporting:view')) {
      entries.push({ path: '/reporting', label: 'Reporting', icon: 'chart' });
    }
    entries.push({ path: '/administration', label: 'Administration', icon: 'settings' });
    return entries;
  });
}
