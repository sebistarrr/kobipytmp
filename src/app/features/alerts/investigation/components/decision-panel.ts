import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { AuthService } from '../../../../core/auth/auth.service';
import {
  DECISION_META,
  type Alert,
  type Decision,
  type Permission,
} from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar';
import { IconComponent, type IconName } from '../../../../shared/ui/icon/icon';
import { ModalComponent } from '../../../../shared/ui/overlay/modal';
import { DecisionBadgeComponent, LevelBadgeComponent } from '../../../../shared/ui/badges/badges';
import { FrDateTimePipe } from '../../../../shared/pipes/format.pipes';

/** Une action proposée à l'analyste, décision de clôture ou escalade. */
interface DecisionOption {
  readonly id: Decision | 'ESCALATE';
  readonly label: string;
  readonly description: string;
  readonly consequence: string;
  readonly tone: 'success' | 'critical' | 'warning' | 'info';
  readonly icon: IconName;
  readonly permission: Permission;
}

const OPTIONS: readonly DecisionOption[] = [
  {
    id: 'HOMONYM',
    label: DECISION_META.HOMONYM.actionLabel,
    description: DECISION_META.HOMONYM.description,
    consequence: DECISION_META.HOMONYM.consequence,
    tone: 'success',
    icon: 'shield-check',
    permission: 'decision:homonym',
  },
  {
    id: 'ESCALATE',
    label: 'Escalader au niveau 2',
    description:
      "Les éléments disponibles ne permettent pas d'écarter la correspondance. Le dossier est transmis à un analyste de niveau 2 pour décision.",
    consequence:
      "L'alerte passe au statut « Escaladée » et rejoint la file du niveau 2. Elle reste ouverte jusqu'à la décision finale.",
    tone: 'warning',
    icon: 'arrow-up',
    permission: 'decision:escalate',
  },
  {
    id: 'NEUTRALIZED',
    label: DECISION_META.NEUTRALIZED.actionLabel,
    description: DECISION_META.NEUTRALIZED.description,
    consequence: DECISION_META.NEUTRALIZED.consequence,
    tone: 'info',
    icon: 'check-circle',
    permission: 'decision:neutralize',
  },
  {
    id: 'CONFIRMED',
    label: DECISION_META.CONFIRMED.actionLabel,
    description: DECISION_META.CONFIRMED.description,
    consequence: DECISION_META.CONFIRMED.consequence,
    tone: 'critical',
    icon: 'alert-triangle',
    permission: 'decision:confirm',
  },
];

const MIN_COMMENT = 20;

/**
 * Zone de décision.
 *
 * Trois principes de conception, dictés par l'enjeu réglementaire :
 * l'analyste voit ce que chaque action déclenchera avant de la choisir ; le
 * commentaire est obligatoire et fait partie de la décision ; rien n'est
 * enregistré sans un écran de confirmation qui récapitule ce qui sera inscrit
 * au journal.
 */
@Component({
  selector: 'app-decision-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    AvatarComponent,
    ModalComponent,
    DecisionBadgeComponent,
    LevelBadgeComponent,
    FrDateTimePipe,
  ],
  template: `
    <section class="panel dp">
      <header class="panel__head">
        <h2 class="panel__title">
          <app-icon name="gavel" [size]="15" />
          Décision
        </h2>
        @if (!isResolved()) {
          <app-level-badge [level]="auth.currentUser().level" />
        }
      </header>

      <div class="panel__body dp__body">
        <!-- ── Dossier déjà clôturé ─────────────────────────────────────── -->
        @if (alert().resolution; as resolution) {
          <div class="dp__resolved" [attr.data-decision]="resolution.decision">
            <div class="dp__resolved-head">
              <app-decision-badge [decision]="resolution.decision" size="lg" />
              <span class="dp__resolved-level">Niveau {{ resolution.level }}</span>
            </div>

            <dl class="dp__resolved-facts">
              <div><dt>Prononcée par</dt><dd>{{ resolution.decidedByName }}</dd></div>
              <div><dt>Le</dt><dd>{{ resolution.decidedAt | frDateTime }}</dd></div>
            </dl>

            <p class="dp__resolved-comment">{{ resolution.comment }}</p>

            <p class="dp__resolved-consequence">
              <app-icon name="info" [size]="12" />
              {{ consequenceOf(resolution.decision) }}
            </p>
          </div>
        } @else if (available().length === 0) {
          <!-- ── Aucune action ouverte à ce niveau ────────────────────── -->
          <div class="dp__locked">
            <app-icon name="lock" [size]="18" />
            <p class="dp__locked-title">Aucune décision disponible</p>
            <p class="dp__locked-text">
              Votre niveau d'habilitation ne permet pas de statuer sur ce dossier. Vous pouvez
              néanmoins le commenter pour documenter votre analyse.
            </p>
          </div>
        } @else {
          <!-- ── Choix de l'action ────────────────────────────────────── -->
          @if (!isAssignedToMe()) {
            <p class="dp__warning">
              <app-icon name="info" [size]="13" />
              Ce dossier ne vous est pas affecté. Statuer dessus vous en attribuera la
              responsabilité.
            </p>
          }

          <ul class="dp__options">
            @for (option of available(); track option.id) {
              <li>
                <button
                  type="button"
                  class="dp__option"
                  [attr.data-tone]="option.tone"
                  [class.is-selected]="selected()?.id === option.id"
                  (click)="choose(option)"
                  [attr.aria-pressed]="selected()?.id === option.id"
                >
                  <span class="dp__option-glyph">
                    <app-icon [name]="option.icon" [size]="15" />
                  </span>
                  <span class="dp__option-body">
                    <span class="dp__option-label">{{ option.label }}</span>
                    <span class="dp__option-desc">{{ option.description }}</span>
                  </span>
                  <span class="dp__option-check">
                    @if (selected()?.id === option.id) {
                      <app-icon name="check" [size]="13" [strokeWidth]="2.6" />
                    }
                  </span>
                </button>
              </li>
            }
          </ul>

          <!-- ── Motivation ────────────────────────────────────────────── -->
          @if (selected(); as option) {
            <div class="dp__comment anim-fade-in">
              <div class="dp__consequence" [attr.data-tone]="option.tone">
                <span class="meta-label">Conséquence</span>
                <p>{{ option.consequence }}</p>
              </div>

              <div class="field">
                <label class="field__label" for="decision-comment">
                  Motivation de la décision
                  <span class="dp__required">obligatoire</span>
                </label>
                <textarea
                  id="decision-comment"
                  class="textarea"
                  [class.is-invalid]="attempted() && !commentValid()"
                  [placeholder]="placeholderFor(option)"
                  [value]="comment()"
                  (input)="onComment($event)"
                ></textarea>

                @if (attempted() && !commentValid()) {
                  <p class="field__error">
                    La motivation doit compter au moins {{ minComment }} caractères. Elle constitue
                    la justification opposable de votre décision.
                  </p>
                } @else {
                  <p class="field__hint">
                    {{ comment().trim().length }} / {{ minComment }} caractères minimum.
                    @if (option.id === 'HOMONYM') {
                      Précisez les éléments d'identification qui permettent d'écarter la
                      correspondance.
                    }
                  </p>
                }
              </div>

              <div class="dp__actions">
                <button type="button" class="btn btn--ghost" (click)="reset()">Annuler</button>
                <button
                  type="button"
                  class="btn"
                  [class.btn--danger]="option.tone === 'critical'"
                  [class.btn--primary]="option.tone !== 'critical'"
                  (click)="review()"
                >
                  Vérifier et valider
                  <app-icon name="arrow-right" [size]="14" />
                </button>
              </div>
            </div>
          }
        }
      </div>
    </section>

    <!-- ══ Confirmation ═══════════════════════════════════════════════════ -->
    <app-modal
      [open]="confirming()"
      title="Confirmer la décision"
      subtitle="Vérifiez le récapitulatif avant enregistrement. Cette action est définitive."
      [tone]="selected()?.tone === 'critical' ? 'danger' : 'info'"
      size="lg"
      (close)="confirming.set(false)"
    >
      @if (selected(); as option) {
        <div class="cf">
          <div class="cf__banner" [attr.data-tone]="option.tone">
            <span class="cf__banner-glyph"><app-icon [name]="option.icon" [size]="17" /></span>
            <div>
              <p class="cf__banner-label">{{ option.label }}</p>
              <p class="cf__banner-alert">
                {{ alert().reference }} — {{ alert().client.firstName }} {{ alert().client.lastName }}
              </p>
            </div>
          </div>

          <dl class="cf__facts">
            <div>
              <dt>Décision</dt>
              <dd>{{ option.label }}</dd>
            </div>
            <div>
              <dt>Utilisateur</dt>
              <dd class="cf__user">
                <app-avatar
                  [name]="auth.displayName()"
                  [hue]="auth.currentUser().avatarHue"
                  size="xs"
                />
                {{ auth.displayName() }}
              </dd>
            </div>
            <div>
              <dt>Rôle</dt>
              <dd>{{ auth.levelMeta().label }}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{{ now() | frDateTime }}</dd>
            </div>
            <div class="cf__facts-full">
              <dt>Filiale</dt>
              <dd>{{ auth.activeSubsidiary().name }} — régulateur {{ auth.activeSubsidiary().regulator }}</dd>
            </div>
            <div class="cf__facts-full">
              <dt>Commentaire</dt>
              <dd class="cf__comment">{{ comment().trim() }}</dd>
            </div>
            <div class="cf__facts-full">
              <dt>Conséquence</dt>
              <dd class="cf__consequence">{{ option.consequence }}</dd>
            </div>
          </dl>

          <div class="audit-note">
            <app-icon name="lock" [size]="14" />
            <span>
              Cette action sera enregistrée dans l'historique d'audit. L'entrée est immuable :
              elle ne pourra être ni modifiée ni supprimée.
            </span>
          </div>
        </div>
      }

      <ng-container modalFooter>
        <button type="button" class="btn btn--ghost" (click)="confirming.set(false)">
          Revenir
        </button>
        <button
          type="button"
          class="btn"
          [class.btn--danger]="selected()?.tone === 'critical'"
          [class.btn--primary]="selected()?.tone !== 'critical'"
          (click)="commit()"
        >
          <app-icon name="check" [size]="14" />
          Enregistrer la décision
        </button>
      </ng-container>
    </app-modal>
  `,
  styleUrl: './decision-panel.scss',
})
export class DecisionPanelComponent {
  protected readonly auth = inject(AuthService);

  readonly alert = input.required<Alert>();
  readonly decide = output<{ decision: Decision; comment: string }>();
  readonly escalate = output<string>();

  protected readonly minComment = MIN_COMMENT;

  protected readonly selected = signal<DecisionOption | null>(null);
  protected readonly comment = signal('');
  protected readonly attempted = signal(false);
  protected readonly confirming = signal(false);
  protected readonly now = signal(new Date().toISOString());

  protected readonly isResolved = computed(() => this.alert().resolution !== null);

  protected readonly isAssignedToMe = computed(
    () => this.alert().assignment?.userId === this.auth.currentUser().id,
  );

  /** Actions réellement ouvertes au niveau d'habilitation courant. */
  protected readonly available = computed(() =>
    OPTIONS.filter((option) => this.auth.has(option.permission)),
  );

  protected readonly commentValid = computed(() => this.comment().trim().length >= MIN_COMMENT);

  protected choose(option: DecisionOption): void {
    this.selected.set(option);
    this.attempted.set(false);
  }

  protected onComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  protected reset(): void {
    this.selected.set(null);
    this.comment.set('');
    this.attempted.set(false);
  }

  /** Ouvre le récapitulatif, après contrôle du commentaire obligatoire. */
  protected review(): void {
    this.attempted.set(true);
    if (!this.commentValid()) return;
    this.now.set(new Date().toISOString());
    this.confirming.set(true);
  }

  protected commit(): void {
    const option = this.selected();
    if (!option || !this.commentValid()) return;

    const comment = this.comment().trim();
    this.confirming.set(false);

    if (option.id === 'ESCALATE') {
      this.escalate.emit(comment);
    } else {
      this.decide.emit({ decision: option.id, comment });
    }

    this.reset();
  }

  protected consequenceOf(decision: Decision): string {
    return DECISION_META[decision].consequence;
  }

  protected placeholderFor(option: DecisionOption): string {
    switch (option.id) {
      case 'HOMONYM':
        return "Les éléments d'identification disponibles permettent d'écarter la correspondance avec la personne listée…";
      case 'ESCALATE':
        return 'Précisez les points qui restent à trancher et les vérifications déjà menées…';
      case 'NEUTRALIZED':
        return "Détaillez les pièces obtenues et l'analyse qui écarte le rapprochement…";
      case 'CONFIRMED':
        return 'Indiquez les critères concordants et les mesures à engager…';
    }
  }
}
