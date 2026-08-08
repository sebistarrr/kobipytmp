import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AlertStore } from '../../../core/state/alert-store';
import { ToastService } from '../../../core/services/toast.service';
import {
  ALERT_STATUSES,
  ALERT_STATUS_META,
  PRIORITIES,
  PRIORITY_META,
  SCREENING_TYPES,
  SCREENING_TYPE_META,
  alertAgeHours,
  isOverdue,
  type Alert,
  type AlertStatus,
  type Priority,
  type ScreeningType,
} from '../../../core/models';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header';
import { DrawerComponent } from '../../../shared/ui/overlay/drawer';
import {
  RiskBadgeComponent,
  StatusBadgeComponent,
  TypeBadgeComponent,
} from '../../../shared/ui/badges/badges';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states/states';
import { SearchFieldComponent } from '../../../shared/ui/search-field/search-field';
import {
  AgeCellComponent,
  AnalystCellComponent,
  PartyCellComponent,
  ScoreCellComponent,
} from '../../../shared/ui/cells/cells';
import { AgePipe, FrDatePipe } from '../../../shared/pipes/format.pipes';
import { isAlertLate, priorityColorVar, slaHoursFor } from '../../../shared/util/display';
import { AlertPreviewComponent } from '../components/alert-preview';

/** Colonnes sur lesquelles la file peut être triée. */
export type SortKey = 'reference' | 'priority' | 'type' | 'client' | 'score' | 'generated' | 'status';
export type SortDirection = 'asc' | 'desc';
export type AgeBucket = 'all' | 'today' | 'week' | 'older' | 'overdue';

interface Sort {
  readonly key: SortKey;
  readonly dir: SortDirection;
}

interface Filters {
  search: string;
  types: readonly ScreeningType[];
  priorities: readonly Priority[];
  statuses: readonly AlertStatus[];
  analystId: string;
  age: AgeBucket;
}

const EMPTY_FILTERS: Filters = {
  search: '',
  types: [],
  priorities: [],
  statuses: [],
  analystId: '',
  age: 'all',
};

/** Tri par défaut : les dossiers les plus urgents en tête. */
const DEFAULT_SORT: Sort = { key: 'priority', dir: 'desc' };

const PAGE_SIZES = [25, 50, 100] as const;

/**
 * File d'investigation.
 *
 * Le même composant sert « Alertes à traiter » et « Mes alertes » : seule la
 * portée change, via les données de route. Cela évite de dupliquer toute la
 * mécanique de filtrage, de tri et de sélection.
 */
@Component({
  selector: 'app-inbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
  imports: [
    PageHeaderComponent,
    IconComponent,
    DrawerComponent,
    AlertPreviewComponent,
    SearchFieldComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    RiskBadgeComponent,
    ScoreCellComponent,
    AnalystCellComponent,
    PartyCellComponent,
    AgeCellComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    AgePipe,
    FrDatePipe,
  ],
})
export class InboxComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(AlertStore);

  /** « mine » restreint la file aux dossiers affectés à l'utilisateur courant. */
  protected readonly scope = toSignal(
    this.route.data.pipe(map((data) => (data['scope'] === 'mine' ? 'mine' : 'all') as 'mine' | 'all')),
    { initialValue: 'all' as const },
  );

  protected readonly filters = signal<Filters>({ ...EMPTY_FILTERS });
  protected readonly sort = signal<Sort>({ ...DEFAULT_SORT });
  protected readonly page = signal(1);
  protected readonly pageSize = signal<number>(25);
  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  protected readonly previewId = signal<string | null>(null);
  protected readonly filtersExpanded = signal(false);

  protected readonly pageSizes = PAGE_SIZES;
  protected readonly allTypes = SCREENING_TYPES;
  protected readonly allPriorities = PRIORITIES;
  protected readonly allStatuses = ALERT_STATUSES.filter((status) => status !== 'PROCESSED');
  protected readonly ageBuckets: readonly { value: AgeBucket; label: string }[] = [
    { value: 'all', label: 'Toutes périodes' },
    { value: 'today', label: 'Moins de 24 h' },
    { value: 'week', label: 'Moins de 7 jours' },
    { value: 'older', label: 'Plus de 7 jours' },
    { value: 'overdue', label: 'Hors délai' },
  ];
  /** Colonnes triables, dans l'ordre du tableau. */
  protected readonly columns: readonly { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: 'reference', label: 'Alerte' },
    { key: 'priority', label: 'Priorité' },
    { key: 'type', label: 'Type' },
    { key: 'client', label: 'Client' },
    { key: 'score', label: 'Score', numeric: true },
    { key: 'generated', label: 'Génération' },
    { key: 'status', label: 'Statut' },
  ];

  constructor() {
    /* Les liens du tableau de bord arrivent avec un statut pré-filtré. */
    const queryStatus = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('statut'))), {
      initialValue: null,
    });

    effect(() => {
      const status = queryStatus();
      if (!status) return;
      if (!ALERT_STATUSES.includes(status as AlertStatus)) return;
      this.filters.update((filters) => ({ ...filters, statuses: [status as AlertStatus] }));
    });

    /* Changer de périmètre ou de filtre ramène toujours à la première page. */
    effect(() => {
      this.filters();
      this.scope();
      this.auth.activeSubsidiaryId();
      this.page.set(1);
      this.selection.set(new Set());
    });
  }

  /* ---------------------------------------------------------------------------
     Filtrage et tri
     ------------------------------------------------------------------------ */

  private readonly baseAlerts = computed(() =>
    this.scope() === 'mine' ? this.store.myAlerts() : this.store.openAlerts(),
  );

  protected readonly filtered = computed(() => {
    const { search, types, priorities, statuses, analystId, age } = this.filters();
    const needle = search.trim().toLowerCase();

    return this.baseAlerts().filter((alert) => {
      if (types.length > 0 && !types.includes(alert.type)) return false;
      if (priorities.length > 0 && !priorities.includes(alert.priority)) return false;
      if (statuses.length > 0 && !statuses.includes(alert.status)) return false;

      if (analystId === '__none__' && alert.assignment) return false;
      if (analystId && analystId !== '__none__' && alert.assignment?.userId !== analystId) return false;

      if (age !== 'all') {
        const hours = alertAgeHours(alert);
        if (age === 'today' && hours >= 24) return false;
        if (age === 'week' && hours >= 168) return false;
        if (age === 'older' && hours < 168) return false;
        if (age === 'overdue' && !isOverdue(alert, PRIORITY_META[alert.priority].slaHours)) return false;
      }

      if (needle) {
        const haystack = [
          alert.reference,
          alert.client.firstName,
          alert.client.lastName,
          alert.client.reference,
          alert.profile.firstName,
          alert.profile.lastName,
          alert.profile.providerId,
          alert.assignment?.userName ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  });

  protected readonly sorted = computed(() => {
    const { key, dir } = this.sort();
    const factor = dir === 'asc' ? 1 : -1;

    return [...this.filtered()].sort((a, b) => {
      switch (key) {
        case 'reference':
          return factor * a.reference.localeCompare(b.reference, 'fr');
        case 'type':
          return factor * a.type.localeCompare(b.type);
        case 'client':
          return (
            factor *
            `${a.client.lastName} ${a.client.firstName}`.localeCompare(
              `${b.client.lastName} ${b.client.firstName}`,
              'fr',
            )
          );
        case 'score':
          return factor * (a.match.score - b.match.score);
        case 'generated':
          return factor * (new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
        case 'status':
          return factor * a.status.localeCompare(b.status);
        default: {
          /* Priorité, puis dépassement de délai, puis ancienneté : trois
             critères, parce qu'une priorité seule laisse trop d'ex æquo. */
          const weight = PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight;
          if (weight !== 0) return factor * weight;

          const lateA = isOverdue(a, PRIORITY_META[a.priority].slaHours) ? 1 : 0;
          const lateB = isOverdue(b, PRIORITY_META[b.priority].slaHours) ? 1 : 0;
          if (lateA !== lateB) return factor * (lateA - lateB);

          return factor * (new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        }
      }
    });
  });

  /**
   * Un clic sur un en-tête trie sur cette colonne ; un second clic inverse le
   * sens. Le changement de colonne repart du sens le plus utile : décroissant
   * pour les valeurs (score, priorité, date), croissant pour le texte.
   */
  protected toggleSort(key: SortKey): void {
    this.sort.update((current) => {
      if (current.key === key) {
        return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
      }
      const textual = key === 'reference' || key === 'client' || key === 'type' || key === 'status';
      return { key, dir: textual ? 'asc' : 'desc' };
    });
  }

  /** Valeur de `aria-sort` attendue par les lecteurs d'écran sur un `<th>`. */
  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    const sort = this.sort();
    if (sort.key !== key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  }

  /** Description du tri courant, restituée dans la légende du tableau. */
  protected readonly sortLabel = computed(() => {
    const { key, dir } = this.sort();
    const column = this.columns.find((candidate) => candidate.key === key);
    const direction = dir === 'asc' ? 'croissant' : 'décroissant';
    return `${column?.label ?? key} (${direction})`;
  });

  /* ---------------------------------------------------------------------------
     Pagination
     ------------------------------------------------------------------------ */

  protected readonly total = computed(() => this.sorted().length);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  protected readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  protected goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(this.pageCount(), page)));
    this.selection.set(new Set());
  }

  protected setPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.page.set(1);
  }

  /* ---------------------------------------------------------------------------
     Filtres
     ------------------------------------------------------------------------ */

  protected onSearch(value: string): void {
    this.filters.update((filters) => ({ ...filters, search: value }));
  }

  protected toggleType(type: ScreeningType): void {
    this.filters.update((filters) => ({
      ...filters,
      types: filters.types.includes(type)
        ? filters.types.filter((item) => item !== type)
        : [...filters.types, type],
    }));
  }

  protected togglePriority(priority: Priority): void {
    this.filters.update((filters) => ({
      ...filters,
      priorities: filters.priorities.includes(priority)
        ? filters.priorities.filter((item) => item !== priority)
        : [...filters.priorities, priority],
    }));
  }

  protected toggleStatus(status: AlertStatus): void {
    this.filters.update((filters) => ({
      ...filters,
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((item) => item !== status)
        : [...filters.statuses, status],
    }));
  }

  protected setAnalyst(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filters.update((filters) => ({ ...filters, analystId: value }));
  }

  protected setAge(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AgeBucket;
    this.filters.update((filters) => ({ ...filters, age: value }));
  }

  protected resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  protected readonly activeFilterCount = computed(() => {
    const filters = this.filters();
    let count = 0;
    if (filters.search.trim()) count++;
    count += filters.types.length;
    count += filters.priorities.length;
    count += filters.statuses.length;
    if (filters.analystId) count++;
    if (filters.age !== 'all') count++;
    return count;
  });

  /** Analystes proposés au filtre : ceux de la filiale active. */
  protected readonly analysts = computed(() => {
    const subsidiaryId = this.auth.activeSubsidiaryId();
    return this.auth.allUsers
      .filter((user) => user.active && user.subsidiaryId === subsidiaryId && user.level !== 'ADMIN')
      .map((user) => ({ id: user.id, name: `${user.firstName} ${user.lastName}` }));
  });

  /* ---------------------------------------------------------------------------
     Sélection multiple
     ------------------------------------------------------------------------ */

  protected isSelected(alertId: string): boolean {
    return this.selection().has(alertId);
  }

  protected toggleSelection(alertId: string, event: Event): void {
    event.stopPropagation();
    this.selection.update((current) => {
      const next = new Set(current);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
  }

  protected readonly allPageSelected = computed(() => {
    const page = this.paged();
    if (page.length === 0) return false;
    const selection = this.selection();
    return page.every((alert) => selection.has(alert.id));
  });

  protected readonly somePageSelected = computed(() => {
    const selection = this.selection();
    return this.paged().some((alert) => selection.has(alert.id)) && !this.allPageSelected();
  });

  protected toggleSelectAll(): void {
    const page = this.paged();
    if (this.allPageSelected()) {
      this.selection.update((current) => {
        const next = new Set(current);
        for (const alert of page) next.delete(alert.id);
        return next;
      });
    } else {
      this.selection.update((current) => {
        const next = new Set(current);
        for (const alert of page) next.add(alert.id);
        return next;
      });
    }
  }

  protected clearSelection(): void {
    this.selection.set(new Set());
  }

  /* ---------------------------------------------------------------------------
     Actions de masse
     ------------------------------------------------------------------------ */

  /** S'affecte en lot les alertes sélectionnées. */
  protected assignSelectionToMe(): void {
    const ids = [...this.selection()];
    if (ids.length === 0) return;

    const me = this.auth.currentUser().id;
    for (const id of ids) this.store.assign(id, me);

    this.clearSelection();
    this.toasts.success(
      `${ids.length} alerte${ids.length > 1 ? 's' : ''} affectée${ids.length > 1 ? 's' : ''}`,
      'Chaque affectation a été enregistrée dans l’historique d’audit.',
    );
  }

  protected releaseSelection(): void {
    const ids = [...this.selection()];
    if (ids.length === 0) return;

    for (const id of ids) this.store.assign(id, null);

    this.clearSelection();
    this.toasts.info(
      `${ids.length} affectation${ids.length > 1 ? 's' : ''} retirée${ids.length > 1 ? 's' : ''}`,
      'Les alertes retournent dans la file commune.',
    );
  }

  /* ---------------------------------------------------------------------------
     Aperçu et navigation
     ------------------------------------------------------------------------ */

  protected readonly previewAlert = computed(() => {
    const id = this.previewId();
    return id ? (this.store.byId(id) ?? null) : null;
  });

  protected openPreview(alert: Alert, event: Event): void {
    event.stopPropagation();
    this.previewId.set(alert.id);
  }

  protected closePreview(): void {
    this.previewId.set(null);
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
     Aides de rendu
     ------------------------------------------------------------------------ */

  protected readonly isLate = isAlertLate;
  protected readonly priorityColor = priorityColorVar;
  protected readonly slaHoursFor = slaHoursFor;

  protected typeLabel(type: ScreeningType): string {
    return SCREENING_TYPE_META[type].label;
  }

  protected priorityLabel(priority: Priority): string {
    return PRIORITY_META[priority].label;
  }

  protected statusLabel(status: AlertStatus): string {
    return ALERT_STATUS_META[status].label;
  }

  protected readonly title = computed(() =>
    this.scope() === 'mine' ? 'Mes alertes' : 'Alertes à traiter',
  );

  protected readonly subtitle = computed(() =>
    this.scope() === 'mine'
      ? 'Les dossiers qui vous sont affectés et restent à instruire.'
      : "File d'investigation du périmètre. Les alertes hors délai et les priorités critiques remontent en tête.",
  );
}
