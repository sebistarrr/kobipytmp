import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { AlertStore } from '../../../core/state/alert-store';
import { ToastService } from '../../../core/services/toast.service';
import {
  DECISION_META,
  PRIORITY_META,
  SCREENING_TYPE_META,
  alertAgeHours,
  isOverdue,
  type Decision,
} from '../../../core/models';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { DrawerComponent } from '../../../shared/ui/overlay/drawer';
import { MatchScoreComponent } from '../../../shared/ui/match-score/match-score';
import { MatchBreakdownComponent } from '../../../shared/ui/match-score/match-breakdown';
import {
  RiskBadgeComponent,
  StatusBadgeComponent,
  TypeBadgeComponent,
} from '../../../shared/ui/badges/badges';
import { EmptyStateComponent } from '../../../shared/ui/states/states';
import { AgePipe, FrDateTimePipe } from '../../../shared/pipes/format.pipes';
import { ClientProfileComponent } from './components/client-profile';
import { ScreeningProfileComponent } from './components/screening-profile';
import { ComparisonTableComponent } from './components/comparison-table';
import { AliasListComponent } from './components/alias-list';
import { DecisionPanelComponent } from './components/decision-panel';
import { CommentThreadComponent } from './components/comment-thread';
import { AssignmentSelectorComponent } from './components/assignment-selector';
import { AuditTimelineComponent } from './components/audit-timeline';

type BottomTab = 'comments' | 'audit';
type MobilePanel = 'client' | 'profile' | 'decision' | null;

/**
 * Poste de travail d'investigation.
 *
 * L'écran est organisé pour répondre, de haut en bas et de gauche à droite,
 * aux questions que se pose l'analyste : quelle alerte, quel client, quelle
 * personne listée, pourquoi le système les rapproche, où sont les écarts, que
 * puis-je décider, et qui est déjà intervenu.
 */
@Component({
  selector: 'app-investigation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investigation.html',
  styleUrl: './investigation.scss',
  imports: [
    RouterLink,
    IconComponent,
    AvatarComponent,
    DrawerComponent,
    MatchScoreComponent,
    MatchBreakdownComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    RiskBadgeComponent,
    EmptyStateComponent,
    ClientProfileComponent,
    ScreeningProfileComponent,
    ComparisonTableComponent,
    AliasListComponent,
    DecisionPanelComponent,
    CommentThreadComponent,
    AssignmentSelectorComponent,
    AuditTimelineComponent,
    AgePipe,
    FrDateTimePipe,
  ],
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class InvestigationComponent {
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(AlertStore);

  /** Alimenté par le routeur grâce à `withComponentInputBinding()`. */
  readonly alertId = input.required<string>();

  protected readonly tab = signal<BottomTab>('comments');
  protected readonly mobilePanel = signal<MobilePanel>(null);
  private readonly aliasOverride = signal<string | null>(null);

  protected readonly alert = computed(() => this.store.byId(this.alertId()) ?? null);

  protected readonly comments = computed(() => this.store.commentsFor(this.alertId()));
  protected readonly auditEvents = computed(() => this.store.auditFor(this.alertId()));

  /** Alias retenu : choix local de l'analyste, sinon celui calculé par le moteur. */
  protected readonly selectedAliasId = computed(
    () => this.aliasOverride() ?? this.alert()?.match.matchedAliasId ?? '',
  );

  protected readonly selectedAlias = computed(() => {
    const alert = this.alert();
    if (!alert) return null;
    return alert.profile.aliases.find((alias) => alias.id === this.selectedAliasId()) ?? null;
  });

  protected readonly neighbours = computed(() => this.store.queueNeighbours(this.alertId()));

  protected readonly typeMeta = computed(() => {
    const alert = this.alert();
    return alert ? SCREENING_TYPE_META[alert.type] : null;
  });

  protected readonly isLate = computed(() => {
    const alert = this.alert();
    return alert ? isOverdue(alert, PRIORITY_META[alert.priority].slaHours) : false;
  });

  protected readonly ageHours = computed(() => {
    const alert = this.alert();
    return alert ? Math.round(alertAgeHours(alert)) : 0;
  });

  protected readonly slaHours = computed(() => {
    const alert = this.alert();
    return alert ? PRIORITY_META[alert.priority].slaHours : 0;
  });

  constructor() {
    /* Ouvrir un dossier affecté le fait passer « en cours » : le statut suit le
       travail réel plutôt qu'une action manuelle que personne ne pense à faire. */
    effect(() => {
      const id = this.alertId();
      untracked(() => {
        this.aliasOverride.set(null);
        this.store.markInProgress(id);
      });
    });
  }

  /* ---------------------------------------------------------------------------
     Actions
     ------------------------------------------------------------------------ */

  protected selectAlias(aliasId: string): void {
    this.aliasOverride.set(aliasId);
    this.store.retainAlias(this.alertId(), aliasId);
  }

  protected onAssign(userId: string | null): void {
    const alert = this.alert();
    if (!alert) return;

    this.store.assign(alert.id, userId);

    if (userId === null) {
      this.toasts.info('Affectation retirée', 'Le dossier retourne dans la file commune.');
      return;
    }

    const isMe = userId === this.auth.currentUser().id;
    const target = this.auth.allUsers.find((user) => user.id === userId);
    this.toasts.success(
      isMe ? 'Dossier pris en charge' : `Dossier affecté à ${target?.firstName} ${target?.lastName}`,
      "L'affectation a été enregistrée dans l'historique d'audit.",
    );
  }

  protected onComment(body: string): void {
    this.store.addComment(this.alertId(), body);
    this.toasts.success('Commentaire publié', 'Il est horodaté et rattaché à votre identité.');
  }

  protected onDecide(payload: { decision: Decision; comment: string }): void {
    const alert = this.alert();
    if (!alert) return;

    const reference = alert.reference;
    const meta = DECISION_META[payload.decision];
    this.store.decide(alert.id, payload.decision, payload.comment);

    const next = this.neighbours().next;

    this.toasts.show(
      {
        kind: payload.decision === 'CONFIRMED' ? 'warning' : 'success',
        title: `${reference} — ${meta.label.toLowerCase()}`,
        detail: meta.consequence,
        actionLabel: next ? 'Alerte suivante' : undefined,
        action: next ? () => void this.router.navigate(['/alertes', next.id]) : undefined,
      },
      6500,
    );
  }

  protected onEscalate(comment: string): void {
    const alert = this.alert();
    if (!alert) return;

    const reference = alert.reference;
    this.store.escalate(alert.id, comment);

    this.toasts.show({
      kind: 'info',
      title: `${reference} escaladée au niveau 2`,
      detail: 'Le dossier rejoint la file du niveau 2 et reste ouvert jusqu’à décision.',
    });
  }

  /* ---------------------------------------------------------------------------
     Navigation dans la file
     ------------------------------------------------------------------------ */

  protected goPrevious(): void {
    const previous = this.neighbours().previous;
    if (previous) void this.router.navigate(['/alertes', previous.id]);
  }

  protected goNext(): void {
    const next = this.neighbours().next;
    if (next) void this.router.navigate(['/alertes', next.id]);
  }

  /**
   * Flèches gauche/droite entre les onglets, comme l'attend le motif ARIA
   * « tablist » : seul l'onglet actif est dans l'ordre de tabulation.
   */
  protected onTabKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();

    const next: BottomTab = this.tab() === 'comments' ? 'audit' : 'comments';
    this.tab.set(next);

    const id = next === 'comments' ? 'onglet-commentaires' : 'onglet-audit';
    queueMicrotask(() => document.getElementById(id)?.focus());
  }

  protected goBackToQueue(): void {
    void this.router.navigate(['/alertes/a-traiter']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable === true;

    if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key.toLowerCase()) {
      case 'j':
        event.preventDefault();
        this.goNext();
        break;
      case 'k':
        event.preventDefault();
        this.goPrevious();
        break;
      case 'a':
        event.preventDefault();
        if (this.alert()?.assignment?.userId !== this.auth.currentUser().id) {
          this.onAssign(this.auth.currentUser().id);
        }
        break;
      case 'c':
        event.preventDefault();
        this.tab.set('comments');
        this.focusComposer();
        break;
      case 'd':
        event.preventDefault();
        this.scrollToDecision();
        break;
    }
  }

  private focusComposer(): void {
    queueMicrotask(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('.ctd__input');
      textarea?.focus();
      textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private scrollToDecision(): void {
    const panel = document.querySelector('.iv__rail app-decision-panel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      this.mobilePanel.set('decision');
    }
  }
}
