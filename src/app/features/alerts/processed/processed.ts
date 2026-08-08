import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AlertStore } from '../../../core/state/alert-store';
import { ToastService } from '../../../core/services/toast.service';
import {
  DECISIONS,
  DECISION_META,
  SCREENING_TYPES,
  SCREENING_TYPE_META,
  processingHours,
  type Alert,
  type Decision,
  type ScreeningType,
} from '../../../core/models';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header';
import { DrawerComponent } from '../../../shared/ui/overlay/drawer';
import { ModalComponent } from '../../../shared/ui/overlay/modal';
import {
  DecisionBadgeComponent,
  TypeBadgeComponent,
} from '../../../shared/ui/badges/badges';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states/states';
import { SearchFieldComponent } from '../../../shared/ui/search-field/search-field';
import {
  AnalystCellComponent,
  PartyCellComponent,
  ScoreCellComponent,
} from '../../../shared/ui/cells/cells';
import { AgePipe, DurationPipe, FrDateTimePipe } from '../../../shared/pipes/format.pipes';
import { AlertPreviewComponent } from '../components/alert-preview';

type SortKey = 'recent' | 'oldest' | 'duration' | 'score';

/**
 * Corbeille des alertes traitées.
 *
 * Écran de consultation avant tout : il documente ce qui a été décidé, par qui
 * et en combien de temps. La seule action possible est la réouverture, qui
 * exige un motif et laisse une trace définitive au journal.
 */
@Component({
  selector: 'app-processed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './processed.html',
  styleUrl: './processed.scss',
  imports: [
    PageHeaderComponent,
    IconComponent,
    DrawerComponent,
    ModalComponent,
    AlertPreviewComponent,
    SearchFieldComponent,
    DecisionBadgeComponent,
    TypeBadgeComponent,
    ScoreCellComponent,
    AnalystCellComponent,
    PartyCellComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    AgePipe,
    DurationPipe,
    FrDateTimePipe,
  ],
})
export class ProcessedComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(AlertStore);

  protected readonly search = signal('');
  protected readonly decisionFilter = signal<Decision | ''>('');
  protected readonly typeFilter = signal<ScreeningType | ''>('');
  protected readonly levelFilter = signal<'' | '1' | '2'>('');
  protected readonly sort = signal<SortKey>('recent');
  protected readonly previewId = signal<string | null>(null);

  /** Alerte en cours de réouverture, et motif saisi. */
  protected readonly reopenTarget = signal<Alert | null>(null);
  protected readonly reopenReason = signal('');
  protected readonly reopenAttempted = signal(false);

  protected readonly allDecisions = DECISIONS;
  protected readonly allTypes = SCREENING_TYPES;
  protected readonly sortOptions: readonly { value: SortKey; label: string }[] = [
    { value: 'recent', label: 'Décision la plus récente' },
    { value: 'oldest', label: 'Décision la plus ancienne' },
    { value: 'duration', label: 'Durée de traitement' },
    { value: 'score', label: 'Score décroissant' },
  ];

  constructor() {
    /* Le tableau de bord renvoie parfois vers une décision précise. */
    const queryDecision = toSignal(
      this.route.queryParamMap.pipe(map((params) => params.get('decision'))),
      { initialValue: null },
    );

    effect(() => {
      const decision = queryDecision();
      if (decision && DECISIONS.includes(decision as Decision)) {
        this.decisionFilter.set(decision as Decision);
      }
    });
  }

  /* ---------------------------------------------------------------------------
     Filtrage
     ------------------------------------------------------------------------ */

  protected readonly filtered = computed(() => {
    const needle = this.search().trim().toLowerCase();
    const decision = this.decisionFilter();
    const type = this.typeFilter();
    const level = this.levelFilter();

    return this.store.processedAlerts().filter((alert) => {
      if (decision && alert.resolution?.decision !== decision) return false;
      if (type && alert.type !== type) return false;
      if (level && String(alert.resolution?.level ?? '') !== level) return false;

      if (needle) {
        const haystack = [
          alert.reference,
          alert.client.firstName,
          alert.client.lastName,
          alert.client.reference,
          alert.resolution?.decidedByName ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  });

  protected readonly sorted = computed(() => {
    const alerts = [...this.filtered()];
    switch (this.sort()) {
      case 'oldest':
        return alerts.sort(
          (a, b) =>
            new Date(a.resolution?.decidedAt ?? 0).getTime() -
            new Date(b.resolution?.decidedAt ?? 0).getTime(),
        );
      case 'duration':
        return alerts.sort((a, b) => (processingHours(b) ?? 0) - (processingHours(a) ?? 0));
      case 'score':
        return alerts.sort((a, b) => b.match.score - a.match.score);
      default:
        return alerts.sort(
          (a, b) =>
            new Date(b.resolution?.decidedAt ?? 0).getTime() -
            new Date(a.resolution?.decidedAt ?? 0).getTime(),
        );
    }
  });

  protected readonly counts = computed(() => {
    const processed = this.store.processedAlerts();
    return {
      total: processed.length,
      homonym: processed.filter((a) => a.resolution?.decision === 'HOMONYM').length,
      neutralized: processed.filter((a) => a.resolution?.decision === 'NEUTRALIZED').length,
      confirmed: processed.filter((a) => a.resolution?.decision === 'CONFIRMED').length,
    };
  });

  protected readonly hasFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.decisionFilter() !== '' ||
      this.typeFilter() !== '' ||
      this.levelFilter() !== '',
  );

  protected resetFilters(): void {
    this.search.set('');
    this.decisionFilter.set('');
    this.typeFilter.set('');
    this.levelFilter.set('');
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected onDecision(event: Event): void {
    this.decisionFilter.set((event.target as HTMLSelectElement).value as Decision | '');
  }

  protected onType(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value as ScreeningType | '');
  }

  protected onLevel(event: Event): void {
    this.levelFilter.set((event.target as HTMLSelectElement).value as '' | '1' | '2');
  }

  protected onSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortKey);
  }

  /* ---------------------------------------------------------------------------
     Aperçu
     ------------------------------------------------------------------------ */

  protected readonly previewAlert = computed(() => {
    const id = this.previewId();
    return id ? (this.store.byId(id) ?? null) : null;
  });

  protected openPreview(alert: Alert, event: Event): void {
    event.stopPropagation();
    this.previewId.set(alert.id);
  }

  protected openAlert(alert: Alert): void {
    void this.router.navigate(['/alertes', alert.id]);
  }

  /** La barre d'espace active la ligne sans faire défiler la page. */
  protected onRowSpace(alert: Alert, event: Event): void {
    event.preventDefault();
    this.openAlert(alert);
  }

  /* ---------------------------------------------------------------------------
     Réouverture
     ------------------------------------------------------------------------ */

  protected readonly canReopen = computed(() => this.auth.has('alert:reopen'));

  protected askReopen(alert: Alert, event: Event): void {
    event.stopPropagation();
    this.reopenReason.set('');
    this.reopenAttempted.set(false);
    this.reopenTarget.set(alert);
  }

  protected cancelReopen(): void {
    this.reopenTarget.set(null);
    this.reopenReason.set('');
    this.reopenAttempted.set(false);
  }

  protected onReasonInput(event: Event): void {
    this.reopenReason.set((event.target as HTMLTextAreaElement).value);
  }

  /** Le motif est obligatoire : c'est lui qui justifie la remise en cause. */
  protected readonly reasonValid = computed(() => this.reopenReason().trim().length >= 20);

  protected confirmReopen(): void {
    const alert = this.reopenTarget();
    if (!alert) return;

    this.reopenAttempted.set(true);
    if (!this.reasonValid()) return;

    const reference = alert.reference;
    this.store.reopen(alert.id, this.reopenReason().trim());
    this.cancelReopen();

    this.toasts.show({
      kind: 'warning',
      title: `${reference} rouverte`,
      detail: "La réouverture et son motif ont été inscrits au journal d'audit.",
      actionLabel: 'Ouvrir le dossier',
      action: () => void this.router.navigate(['/alertes', alert.id]),
    });
  }

  /* ---------------------------------------------------------------------------
     Aides de rendu
     ------------------------------------------------------------------------ */

  protected duration(alert: Alert): number | null {
    return processingHours(alert);
  }

  protected decisionColor(alert: Alert): string {
    const decision = alert.resolution?.decision;
    return decision ? DECISION_META[decision].colorVar : '--neutral';
  }

  protected decisionLabel(decision: Decision): string {
    return DECISION_META[decision].label;
  }

  protected typeLabel(type: ScreeningType): string {
    return SCREENING_TYPE_META[type].label;
  }
}
