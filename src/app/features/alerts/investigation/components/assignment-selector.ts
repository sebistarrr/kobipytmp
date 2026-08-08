import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { AuthService } from '../../../../core/auth/auth.service';
import { USER_LEVEL_META, type AlertAssignment } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { LevelBadgeComponent } from '../../../../shared/ui/badges/badges';
import { RelativeTimePipe } from '../../../../shared/pipes/format.pipes';

/**
 * Affectation du dossier.
 *
 * Un analyste peut toujours se saisir d'une alerte libre. Réaffecter à un
 * tiers demande en revanche l'habilitation correspondante — la règle est
 * appliquée ici pour l'affichage, et revalidée côté serveur.
 */
@Component({
  selector: 'app-assignment-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent, LevelBadgeComponent, RelativeTimePipe],
  template: `
    <div class="as">
      @if (assignment(); as current) {
        <div class="as__current">
          <app-avatar [name]="current.userName" [hue]="current.userHue" size="lg" />
          <div class="as__current-body">
            <p class="as__current-name">{{ current.userName }}</p>
            <div class="as__current-meta">
              <app-level-badge [level]="current.userLevel" />
              <span class="as__since">
                affectée {{ current.assignedAt | relativeTime }}
                @if (current.assignedByName !== current.userName) {
                  · par {{ current.assignedByName }}
                }
              </span>
            </div>
          </div>
        </div>
      } @else {
        <div class="as__empty">
          <span class="as__empty-glyph"><app-icon name="user" [size]="16" /></span>
          <div>
            <p class="as__empty-title">Non affectée</p>
            <p class="as__empty-text">Ce dossier n'est pris en charge par aucun analyste.</p>
          </div>
        </div>
      }

      <div class="as__actions">
        @if (!isMine()) {
          <button type="button" class="btn btn--secondary btn--sm as__grow" (click)="assignToMe()">
            <app-icon name="user-check" [size]="13" />
            {{ assignment() ? 'Me réaffecter le dossier' : "M'affecter le dossier" }}
          </button>
        }

        @if (canAssignOthers()) {
          <div class="as__menu-anchor">
            <button
              type="button"
              class="btn btn--secondary btn--sm btn--icon"
              (click)="menuOpen.set(!menuOpen())"
              [attr.aria-expanded]="menuOpen()"
              aria-label="Affecter à un autre analyste"
              title="Affecter à un autre analyste"
            >
              <app-icon name="users" [size]="14" />
            </button>

            @if (menuOpen()) {
              <div class="as__menu anim-scale-in">
                <p class="as__menu-title">Affecter à</p>

                @for (candidate of candidates(); track candidate.id) {
                  <button
                    type="button"
                    class="as__menu-item"
                    [class.is-active]="candidate.id === assignment()?.userId"
                    (click)="choose(candidate.id)"
                  >
                    <app-avatar [name]="candidate.name" [hue]="candidate.hue" size="xs" />
                    <span class="as__menu-body">
                      <span class="as__menu-name">{{ candidate.name }}</span>
                      <span class="as__menu-role">{{ candidate.role }}</span>
                    </span>
                    @if (candidate.id === assignment()?.userId) {
                      <app-icon name="check" [size]="14" />
                    }
                  </button>
                }

                @if (assignment()) {
                  <div class="as__menu-sep"></div>
                  <button type="button" class="as__menu-item as__menu-item--danger" (click)="release()">
                    <span class="as__menu-glyph"><app-icon name="user-minus" [size]="13" /></span>
                    <span class="as__menu-body">
                      <span class="as__menu-name">Retirer l'affectation</span>
                      <span class="as__menu-role">Le dossier retourne dans la file commune</span>
                    </span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <p class="as__note">
        <app-icon name="lock" [size]="11" />
        Toute modification d'affectation est enregistrée dans l'historique d'audit.
      </p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .as {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
    }

    .as__current {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
    }

    .as__current-body {
      min-width: 0;
    }

    .as__current-name {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      line-height: var(--lh-snug);
    }

    .as__current-meta {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex-wrap: wrap;
      margin-top: 3px;
    }

    .as__since {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }

    .as__empty {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-3);
      border-radius: var(--r-md);
      border: 1px dashed var(--border-default);
    }

    .as__empty-glyph {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      flex: none;
      border-radius: var(--r-full);
      background: var(--bg-active);
      color: var(--text-tertiary);
    }

    .as__empty-title {
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--text-secondary);
    }

    .as__empty-text {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }

    .as__actions {
      display: flex;
      gap: var(--sp-2);
    }

    .as__grow {
      flex: 1;
    }

    .as__menu-anchor {
      position: relative;
      display: flex;
    }

    .as__menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: var(--z-sticky);
      min-width: 280px;
      padding: var(--sp-2);
      border-radius: var(--r-lg);
      border: 1px solid var(--border-default);
      background: var(--bg-overlay);
      box-shadow: var(--shadow-lg);
      transform-origin: top right;
    }

    .as__menu-title {
      padding: var(--sp-2) var(--sp-2) var(--sp-1);
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-widest);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .as__menu-item {
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

    .as__menu-item:hover {
      background: var(--bg-hover);
    }

    .as__menu-item.is-active {
      background: var(--accent-soft);
    }

    .as__menu-item--danger:hover {
      background: var(--critical-soft);
    }

    .as__menu-item--danger:hover .as__menu-name {
      color: var(--critical-text);
    }

    .as__menu-glyph {
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      flex: none;
      border-radius: var(--r-full);
      background: var(--bg-active);
      color: var(--text-tertiary);
    }

    .as__menu-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.3;
    }

    .as__menu-name {
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
    }

    .as__menu-role {
      font-size: 10px;
      color: var(--text-tertiary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .as__menu-sep {
      height: 1px;
      margin: var(--sp-1) 0;
      background: var(--border-subtle);
    }

    .as__note {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      font-size: 10px;
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .as__note app-icon {
      margin-top: 1px;
    }
  `,
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class AssignmentSelectorComponent {
  private readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly assignment = input.required<AlertAssignment | null>();
  /** Émet l'identifiant de l'analyste, ou `null` pour retirer l'affectation. */
  readonly assign = output<string | null>();

  protected readonly menuOpen = signal(false);

  protected readonly isMine = computed(() => this.assignment()?.userId === this.auth.currentUser().id);
  protected readonly canAssignOthers = computed(() => this.auth.has('alert:assign-others'));

  /** Analystes de la filiale active, hors comptes désactivés. */
  protected readonly candidates = computed(() => {
    const subsidiaryId = this.auth.activeSubsidiaryId();
    return this.auth.allUsers
      .filter((user) => user.active && user.subsidiaryId === subsidiaryId && user.level !== 'ADMIN')
      .map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: `${USER_LEVEL_META[user.level].shortLabel} · ${user.jobTitle}`,
        hue: user.avatarHue,
      }));
  });

  protected assignToMe(): void {
    this.assign.emit(this.auth.currentUser().id);
    this.menuOpen.set(false);
  }

  protected choose(userId: string): void {
    this.assign.emit(userId);
    this.menuOpen.set(false);
  }

  protected release(): void {
    this.assign.emit(null);
    this.menuOpen.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    if (!(this.host.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
