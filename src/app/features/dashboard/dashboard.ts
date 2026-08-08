import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AlertStore } from '../../core/state/alert-store';
import {
  ALERT_STATUS_META,
  PRIORITY_META,
  SCREENING_TYPE_META,
  alertAgeHours,
  isOverdue,
  type Alert,
} from '../../core/models';
import { IconComponent } from '../../shared/ui/icon/icon';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header';
import {
  SegmentedControlComponent,
  type SegmentOption,
} from '../../shared/ui/segmented-control/segmented-control';
import {
  AgeCellComponent,
  AnalystCellComponent,
  PartyCellComponent,
  ScoreCellComponent,
} from '../../shared/ui/cells/cells';
import { isAlertLate, priorityColorVar, slaHoursFor } from '../../shared/util/display';
import { AreaChartComponent, type AreaSeries } from '../../shared/ui/charts/area-chart';
import { BarListComponent, type BarItem } from '../../shared/ui/charts/bar-list';
import { DonutChartComponent, type DonutSegment } from '../../shared/ui/charts/donut-chart';
import {
  RiskBadgeComponent,
  StatusBadgeComponent,
  TypeBadgeComponent,
} from '../../shared/ui/badges/badges';
import { EmptyStateComponent, TableSkeletonComponent } from '../../shared/ui/states/states';
import { DurationPipe, FrDateTimePipe } from '../../shared/pipes/format.pipes';

type Period = 7 | 30 | 90;

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    KpiCardComponent,
    SegmentedControlComponent,
    AreaChartComponent,
    DonutChartComponent,
    BarListComponent,
    IconComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    RiskBadgeComponent,
    ScoreCellComponent,
    AnalystCellComponent,
    PartyCellComponent,
    AgeCellComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    DurationPipe,
    FrDateTimePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly store = inject(AlertStore);

  protected readonly period = signal<Period>(30);
  protected readonly periodOptions: readonly SegmentOption<Period>[] = [
    { value: 7, label: '7 j', hint: '7 derniers jours' },
    { value: 30, label: '30 j', hint: '30 derniers jours' },
    { value: 90, label: '90 j', hint: '90 derniers jours' },
  ];

  protected readonly firstName = computed(() => this.auth.currentUser().firstName);
  protected readonly subsidiary = this.auth.activeSubsidiary;
  protected readonly stats = this.store.stats;

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Bonsoir';
    if (hour < 18) return 'Bonjour';
    return 'Bonsoir';
  });

  protected readonly periodLabel = computed(() => {
    switch (this.period()) {
      case 7:
        return '7 derniers jours';
      case 30:
        return '30 derniers jours';
      default:
        return '90 derniers jours';
    }
  });

  /* ---------------------------------------------------------------------------
     Séries temporelles
     ------------------------------------------------------------------------ */

  private readonly volume = computed(() => this.store.volumeSeries(this.period()));

  protected readonly volumeSeries = computed<readonly AreaSeries[]>(() => [
    {
      key: 'generated',
      label: 'Générées',
      tone: 'var(--accent)',
      values: this.volume().map((point) => point.generated),
    },
    {
      key: 'processed',
      label: 'Traitées',
      tone: 'var(--success)',
      values: this.volume().map((point) => point.processed),
    },
  ]);

  protected readonly volumeLabels = computed(() =>
    this.volume().map((point) =>
      new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(point.date)),
    ),
  );

  protected readonly volumeTotals = computed(() => {
    const points = this.volume();
    return {
      generated: points.reduce((sum, point) => sum + point.generated, 0),
      processed: points.reduce((sum, point) => sum + point.processed, 0),
    };
  });

  /**
   * Variation entre la dernière semaine et la précédente. Sert de tendance aux
   * cartes d'indicateur ; renvoie `null` lorsque la base de comparaison est
   * vide, pour éviter d'afficher une progression de « +100 % » trompeuse.
   */
  private trend(selector: (alert: Alert) => string | null): number | null {
    const alerts = this.store.alerts();
    const now = Date.now();
    const week = 7 * 86_400_000;

    let current = 0;
    let previous = 0;

    for (const alert of alerts) {
      const iso = selector(alert);
      if (!iso) continue;
      const age = now - new Date(iso).getTime();
      if (age < week) current++;
      else if (age < week * 2) previous++;
    }

    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  protected readonly generatedTrend = computed(() => this.trend((alert) => alert.generatedAt));
  protected readonly processedTrend = computed(() =>
    this.trend((alert) => alert.resolution?.decidedAt ?? null),
  );

  /** Courbe de fond des cartes : les sept derniers jours, quel que soit le filtre. */
  private readonly weekly = computed(() => this.store.volumeSeries(14));
  protected readonly generatedSpark = computed(() => this.weekly().map((point) => point.generated));
  protected readonly processedSpark = computed(() => this.weekly().map((point) => point.processed));
  protected readonly backlogSpark = computed(() => {
    /* Reconstitution du stock : cumul des générées moins les traitées, jour par jour. */
    let backlog = this.stats().open;
    const points = [...this.weekly()].reverse();
    const series: number[] = [];
    for (const point of points) {
      series.push(backlog);
      backlog = Math.max(0, backlog - point.generated + point.processed);
    }
    return series.reverse();
  });

  /* ---------------------------------------------------------------------------
     Répartitions
     ------------------------------------------------------------------------ */

  protected readonly typeSegments = computed<readonly DonutSegment[]>(() =>
    this.store.byType().map(({ type, count }) => ({
      key: type,
      label: SCREENING_TYPE_META[type].fullLabel,
      value: count,
      tone: `var(${SCREENING_TYPE_META[type].colorVar})`,
    })),
  );

  protected readonly statusBars = computed<readonly BarItem[]>(() => {
    const total = this.stats().total || 1;
    return this.store.byStatus().map(({ status, count }) => ({
      key: status,
      label: ALERT_STATUS_META[status].label,
      value: count,
      tone: `var(${ALERT_STATUS_META[status].colorVar})`,
      hint: `${Math.round((count / total) * 100)} %`,
    }));
  });

  protected readonly decisionBars = computed<readonly BarItem[]>(() => {
    const stats = this.stats();
    return [
      { key: 'homonym', label: 'Homonyme', value: stats.homonym, tone: 'var(--success)' },
      { key: 'neutralized', label: 'Neutralisée', value: stats.neutralized, tone: 'var(--info)' },
      { key: 'confirmed', label: 'Avérée', value: stats.confirmed, tone: 'var(--critical)' },
    ];
  });

  /* ---------------------------------------------------------------------------
     Alertes prioritaires
     ------------------------------------------------------------------------ */

  /**
   * Les dossiers qui exigent une action maintenant : d'abord le dépassement de
   * délai, puis la priorité, puis l'ancienneté. Un score élevé sur une alerte
   * récente ne prime pas sur une alerte critique déjà hors délai.
   */
  protected readonly priorityAlerts = computed(() =>
    [...this.store.openAlerts()]
      .sort((a, b) => {
        const overdueA = isOverdue(a, PRIORITY_META[a.priority].slaHours) ? 1 : 0;
        const overdueB = isOverdue(b, PRIORITY_META[b.priority].slaHours) ? 1 : 0;
        if (overdueA !== overdueB) return overdueB - overdueA;

        const weightA = PRIORITY_META[a.priority].weight;
        const weightB = PRIORITY_META[b.priority].weight;
        if (weightA !== weightB) return weightB - weightA;

        return alertAgeHours(b) - alertAgeHours(a);
      })
      .slice(0, 7),
  );

  protected readonly isLate = isAlertLate;
  protected readonly priorityColor = priorityColorVar;
  protected readonly slaHoursFor = slaHoursFor;

  protected openAlert(alert: Alert): void {
    void this.router.navigate(['/alertes', alert.id]);
  }

  /** La barre d'espace active la ligne sans faire défiler la page. */
  protected onRowSpace(alert: Alert, event: Event): void {
    event.preventDefault();
    this.openAlert(alert);
  }

  protected readonly averageHours = computed(() => this.stats().averageProcessingHours);

  /** Part des alertes traitées dans le délai attendu. */
  protected readonly slaRate = computed(() => {
    const processed = this.store.processedAlerts();
    if (processed.length === 0) return 100;
    const onTime = processed.filter((alert) => {
      if (!alert.resolution) return false;
      const hours =
        (new Date(alert.resolution.decidedAt).getTime() - new Date(alert.generatedAt).getTime()) /
        3_600_000;
      return hours <= PRIORITY_META[alert.priority].slaHours;
    }).length;
    return Math.round((onTime / processed.length) * 100);
  });
}
