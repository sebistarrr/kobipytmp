import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { AlertStore } from '../../core/state/alert-store';
import { SCREENING_TYPE_META, type Alert } from '../../core/models';
import { IconComponent, type IconName } from '../../shared/ui/icon/icon';
import { LayoutService } from '../layout.service';

interface Command {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly icon: IconName;
  readonly tone?: string;
  readonly run: () => void;
}

/**
 * Recherche globale et palette de commandes.
 *
 * Point d'entrée unique au clavier : l'analyste tape une référence d'alerte,
 * un nom de client ou le début d'un écran, puis valide. C'est la façon la plus
 * rapide de rejoindre un dossier sans repasser par les listes.
 */
@Component({
  selector: 'app-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (layout.paletteOpen()) {
      <div class="cp__scrim" (click)="layout.closePalette()" aria-hidden="true"></div>

      <div class="cp" role="dialog" aria-modal="true" aria-label="Recherche globale">
        <div class="cp__field">
          <app-icon name="search" [size]="17" />
          <input
            #search
            type="text"
            class="cp__input"
            placeholder="Référence d'alerte, nom de client, écran…"
            autocomplete="off"
            spellcheck="false"
            [value]="query()"
            (input)="onInput($event)"
            (keydown)="onKeydown($event)"
            aria-label="Recherche"
          />
          <span class="kbd">Échap</span>
        </div>

        <div class="cp__results scroll-y">
          @if (alertResults().length > 0) {
            <p class="cp__group">Alertes</p>
            @for (alert of alertResults(); track alert.id; let i = $index) {
              <button
                type="button"
                class="cp__row"
                [class.is-active]="cursor() === i"
                (click)="openAlert(alert)"
                (mouseenter)="cursor.set(i)"
              >
                <span class="cp__row-glyph" [style.--tone]="'var(' + typeTone(alert) + ')'">
                  <app-icon name="shield" [size]="14" />
                </span>
                <span class="cp__row-body">
                  <span class="cp__row-label">
                    <span class="mono">{{ alert.reference }}</span>
                    — {{ alert.client.firstName }} {{ alert.client.lastName }}
                  </span>
                  <span class="cp__row-meta">
                    {{ typeLabel(alert) }} · score {{ alert.match.score }} % ·
                    {{ alert.client.reference }}
                  </span>
                </span>
                <app-icon name="arrow-right" [size]="14" />
              </button>
            }
          }

          @if (commandResults().length > 0) {
            <p class="cp__group">Navigation</p>
            @for (command of commandResults(); track command.id; let i = $index) {
              <button
                type="button"
                class="cp__row"
                [class.is-active]="cursor() === alertResults().length + i"
                (click)="run(command)"
                (mouseenter)="cursor.set(alertResults().length + i)"
              >
                <span class="cp__row-glyph">
                  <app-icon [name]="command.icon" [size]="14" />
                </span>
                <span class="cp__row-body">
                  <span class="cp__row-label">{{ command.label }}</span>
                  <span class="cp__row-meta">{{ command.hint }}</span>
                </span>
                <app-icon name="arrow-right" [size]="14" />
              </button>
            }
          }

          @if (total() === 0) {
            <div class="cp__empty">
              <app-icon name="search" [size]="20" />
              <p>Aucun résultat pour « {{ query() }} »</p>
              <span>Essayez une référence d'alerte (A-82931) ou un nom de client.</span>
            </div>
          }
        </div>

        <footer class="cp__foot">
          <span><span class="kbd">↑</span><span class="kbd">↓</span> Naviguer</span>
          <span><span class="kbd">↵</span> Ouvrir</span>
          <span><span class="kbd">Échap</span> Fermer</span>
        </footer>
      </div>
    }
  `,
  styles: `
    .cp__scrim {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal);
      background: var(--scrim);
      backdrop-filter: blur(3px);
      animation: fade-in var(--dur-fast) var(--ease-out);
    }

    .cp {
      position: fixed;
      top: 12vh;
      left: 50%;
      transform: translateX(-50%);
      z-index: calc(var(--z-modal) + 1);
      width: min(620px, calc(100vw - var(--sp-8)));
      display: flex;
      flex-direction: column;
      max-height: 68vh;
      border-radius: var(--r-xl);
      border: 1px solid var(--border-default);
      background: var(--bg-overlay);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      animation: scale-in var(--dur-base) var(--ease-out);
    }

    .cp__field {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-4);
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-tertiary);
      flex: none;
    }

    .cp__input {
      flex: 1;
      background: none;
      border: none;
      font-size: var(--fs-md);
      color: var(--text-primary);
    }

    .cp__input::placeholder {
      color: var(--text-tertiary);
    }

    .cp__results {
      flex: 1;
      min-height: 0;
      padding: var(--sp-2);
    }

    .cp__group {
      padding: var(--sp-2) var(--sp-2) var(--sp-1);
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-widest);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .cp__row {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      width: 100%;
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--r-md);
      text-align: left;
      color: var(--text-tertiary);
      transition: background var(--dur-instant) var(--ease-out);
    }

    .cp__row.is-active {
      background: var(--accent-soft);
    }

    .cp__row-glyph {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      flex: none;
      border-radius: var(--r-sm);
      background: var(--bg-active);
      color: var(--tone, var(--text-secondary));
    }

    .cp__row-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .cp__row-label {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cp__row-meta {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cp__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-2);
      padding: var(--sp-10) var(--sp-6);
      text-align: center;
      color: var(--text-tertiary);
    }

    .cp__empty p {
      font-size: var(--fs-sm);
      color: var(--text-secondary);
    }

    .cp__empty span {
      font-size: var(--fs-xs);
    }

    .cp__foot {
      display: flex;
      gap: var(--sp-4);
      padding: var(--sp-2) var(--sp-4);
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-sunken);
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      flex: none;
    }

    .cp__foot span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `,
})
export class CommandPaletteComponent {
  protected readonly layout = inject(LayoutService);
  private readonly store = inject(AlertStore);
  private readonly router = inject(Router);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly query = signal('');
  protected readonly cursor = signal(0);

  private readonly commands: readonly Command[] = [
    {
      id: 'nav-dashboard',
      label: 'Tableau de bord',
      hint: 'Vue de synthèse du périmètre',
      icon: 'dashboard',
      run: () => this.router.navigate(['/tableau-de-bord']),
    },
    {
      id: 'nav-inbox',
      label: 'Alertes à traiter',
      hint: 'File d’investigation',
      icon: 'inbox',
      run: () => this.router.navigate(['/alertes/a-traiter']),
    },
    {
      id: 'nav-mine',
      label: 'Mes alertes',
      hint: 'Dossiers qui vous sont affectés',
      icon: 'user-check',
      run: () => this.router.navigate(['/alertes/mes-alertes']),
    },
    {
      id: 'nav-processed',
      label: 'Alertes traitées',
      hint: 'Corbeille des décisions prises',
      icon: 'archive',
      run: () => this.router.navigate(['/alertes/traitees']),
    },
    {
      id: 'nav-reporting',
      label: 'Reporting',
      hint: 'Volumétrie et performance',
      icon: 'chart',
      run: () => this.router.navigate(['/reporting']),
    },
    {
      id: 'nav-admin',
      label: 'Administration',
      hint: 'Habilitations, filiales, paramétrage',
      icon: 'settings',
      run: () => this.router.navigate(['/administration']),
    },
  ];

  protected readonly alertResults = computed<readonly Alert[]>(() => {
    const needle = this.query().trim().toLowerCase();
    if (needle.length < 2) return this.store.alerts().slice(0, 5);

    return this.store
      .alerts()
      .filter((alert) => {
        const haystack = [
          alert.reference,
          alert.client.firstName,
          alert.client.lastName,
          alert.client.reference,
          alert.profile.firstName,
          alert.profile.lastName,
          alert.profile.providerId,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 7);
  });

  protected readonly commandResults = computed(() => {
    const needle = this.query().trim().toLowerCase();
    if (needle.length === 0) return this.commands;
    return this.commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) || command.hint.toLowerCase().includes(needle),
    );
  });

  protected readonly total = computed(() => this.alertResults().length + this.commandResults().length);

  constructor() {
    /* Réinitialisation à chaque ouverture : la palette repart toujours vierge. */
    effect(() => {
      if (!this.layout.paletteOpen()) return;
      this.query.set('');
      this.cursor.set(0);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    });
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.cursor.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.layout.closePalette();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.cursor.update((index) => Math.min(this.total() - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.cursor.update((index) => Math.max(0, index - 1));
        break;
      case 'Enter': {
        event.preventDefault();
        const index = this.cursor();
        const alerts = this.alertResults();
        if (index < alerts.length) {
          this.openAlert(alerts[index]!);
        } else {
          const command = this.commandResults()[index - alerts.length];
          if (command) this.run(command);
        }
        break;
      }
    }
  }

  protected openAlert(alert: Alert): void {
    this.layout.closePalette();
    void this.router.navigate(['/alertes', alert.id]);
  }

  protected run(command: Command): void {
    this.layout.closePalette();
    command.run();
  }

  protected typeLabel(alert: Alert): string {
    return SCREENING_TYPE_META[alert.type].label;
  }

  protected typeTone(alert: Alert): string {
    return SCREENING_TYPE_META[alert.type].colorVar;
  }
}
