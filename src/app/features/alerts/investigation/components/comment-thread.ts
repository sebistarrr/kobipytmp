import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { AuthService } from '../../../../core/auth/auth.service';
import type { AlertComment } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { LevelBadgeComponent } from '../../../../shared/ui/badges/badges';
import { FrDateTimePipe, RelativeTimePipe } from '../../../../shared/pipes/format.pipes';

/**
 * Fil de commentaires du dossier.
 *
 * Les commentaires sont horodatés et attribués : ils font partie du dossier au
 * même titre que les décisions, et servent de mémoire entre les analystes qui
 * se succèdent sur une alerte.
 */
@Component({
  selector: 'app-comment-thread',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent, LevelBadgeComponent, FrDateTimePipe, RelativeTimePipe],
  template: `
    <div class="ctd">
      @if (ordered().length > 0) {
        <ul class="ctd__list">
          @for (comment of ordered(); track comment.id) {
            <li class="ctd__item" [class.is-mine]="comment.authorId === currentUserId()">
              <app-avatar [name]="comment.authorName" [hue]="comment.authorHue" size="sm" />

              <div class="ctd__bubble">
                <header class="ctd__head">
                  <span class="ctd__author">{{ comment.authorName }}</span>
                  <app-level-badge [level]="comment.authorLevel" />
                  <span class="ctd__time" [title]="comment.createdAt | frDateTime">
                    {{ comment.createdAt | relativeTime }}
                  </span>
                </header>
                <p class="ctd__body">{{ comment.body }}</p>
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="ctd__empty">
          Aucun commentaire pour l'instant. Consignez ici les vérifications effectuées et les pièces
          obtenues : elles justifieront la décision.
        </p>
      }

      @if (canComment()) {
        <div class="ctd__composer" [class.is-focused]="focused()">
          <app-avatar [name]="authorName()" [hue]="authorHue()" size="sm" />

          <div class="ctd__composer-body">
            <textarea
              class="ctd__input"
              rows="2"
              placeholder="Ajouter un commentaire…"
              [value]="draft()"
              (input)="onInput($event)"
              (focus)="focused.set(true)"
              (keydown)="onKeydown($event)"
              aria-label="Nouveau commentaire"
            ></textarea>

            @if (focused() || draft().length > 0) {
              <div class="ctd__composer-foot anim-fade-in">
                <span class="ctd__hint">
                  <span class="kbd">Ctrl</span><span class="kbd">↵</span> pour publier
                </span>
                <div class="ctd__composer-actions">
                  <button type="button" class="btn btn--ghost btn--sm" (click)="cancel()">
                    Annuler
                  </button>
                  <button
                    type="button"
                    class="btn btn--primary btn--sm"
                    [disabled]="draft().trim().length === 0"
                    (click)="publish()"
                  >
                    <app-icon name="message" [size]="13" />
                    Publier
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .ctd {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }

    .ctd__list {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
    }

    .ctd__item {
      display: flex;
      gap: var(--sp-3);
      animation: fade-in-up var(--dur-base) var(--ease-out);
    }

    .ctd__bubble {
      flex: 1;
      min-width: 0;
      padding: var(--sp-3);
      border-radius: var(--r-md);
      border: 1px solid var(--border-subtle);
      background: var(--bg-inset);
    }

    /* Les commentaires de l'utilisateur courant sont légèrement teintés. */
    .ctd__item.is-mine .ctd__bubble {
      border-color: var(--accent-border);
      background: color-mix(in srgb, var(--accent) 5%, var(--bg-inset));
    }

    .ctd__head {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex-wrap: wrap;
      margin-bottom: var(--sp-2);
    }

    .ctd__author {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .ctd__time {
      margin-left: auto;
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .ctd__body {
      font-size: var(--fs-sm);
      color: var(--text-secondary);
      line-height: var(--lh-normal);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .ctd__empty {
      padding: var(--sp-4);
      border-radius: var(--r-md);
      border: 1px dashed var(--border-default);
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
      line-height: var(--lh-normal);
      text-align: center;
    }

    /* --- Zone de saisie --- */
    .ctd__composer {
      display: flex;
      gap: var(--sp-3);
      padding-top: var(--sp-4);
      border-top: 1px solid var(--border-subtle);
    }

    .ctd__composer-body {
      flex: 1;
      min-width: 0;
      border-radius: var(--r-md);
      border: 1px solid var(--border-default);
      background: var(--bg-inset);
      transition:
        border-color var(--dur-fast) var(--ease-out),
        box-shadow var(--dur-fast) var(--ease-out);
    }

    .ctd__composer.is-focused .ctd__composer-body {
      border-color: var(--border-focus);
      box-shadow: var(--shadow-focus);
      background: var(--bg-surface);
    }

    .ctd__input {
      display: block;
      width: 100%;
      padding: var(--sp-3);
      background: none;
      border: none;
      resize: vertical;
      min-height: 60px;
      font-family: inherit;
      font-size: var(--fs-sm);
      color: var(--text-primary);
      line-height: var(--lh-snug);
    }

    .ctd__input::placeholder {
      color: var(--text-tertiary);
    }

    .ctd__composer-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-3);
      padding: var(--sp-2) var(--sp-3);
      border-top: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .ctd__hint {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }

    .ctd__composer-actions {
      display: flex;
      gap: var(--sp-2);
    }
  `,
})
export class CommentThreadComponent {
  private readonly auth = inject(AuthService);

  readonly comments = input.required<readonly AlertComment[]>();
  readonly canComment = input(true);
  readonly submit = output<string>();

  protected readonly draft = signal('');
  protected readonly focused = signal(false);

  protected readonly currentUserId = computed(() => this.auth.currentUser().id);
  protected readonly authorName = computed(() => this.auth.displayName());
  protected readonly authorHue = computed(() => this.auth.currentUser().avatarHue);

  /** Ordre chronologique : on lit le dossier du plus ancien au plus récent. */
  protected readonly ordered = computed(() =>
    [...this.comments()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  );

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.publish();
    }
  }

  protected publish(): void {
    const body = this.draft().trim();
    if (!body) return;
    this.submit.emit(body);
    this.draft.set('');
    this.focused.set(false);
  }

  protected cancel(): void {
    this.draft.set('');
    this.focused.set(false);
  }
}
