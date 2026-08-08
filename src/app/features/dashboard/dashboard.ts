import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AlertStore } from '../../core/state/alert-store';
import {
  ALERT_STATUS_META,
  PRIORITY_META,
  SCREENING_TYPE_META,
  alertAgeHours,
  isOverdue,
  scoreBand,
  type Alert,
} from '../../core/models';
import { AvatarComponent } from '../../shared/ui/avatar/avatar';
import { IconComponent } from '../../shared/ui/icon/icon';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header';
import { AreaChartComponent, type AreaSeries } from '../../shared/ui/charts/area-chart';
import { BarListComponent, type BarItem } from '../../shared/ui/charts/bar-list';
import { DonutChartComponent, type DonutSegment } from '../../shared/ui/charts/donut-chart';
import {
  RiskBadgeComponent,
  StatusBadgeComponent,
  TypeBadgeComponent,
} from '../../shared/ui/badges/badges';
import { EmptyStateComponent, TableSkeletonComponent } from '../../shared/ui/states/states';
import { AgePipe, DurationPipe, FrDateTimePipe } from '../../shared/pipes/format.pipes';

type Period = 7 | 30 | 90;

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    KpiCardComponent,
    AreaChartComponent,
    DonutChartComponent,
    BarListComponent,
    IconComponent,
    AvatarComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    RiskBadgeComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    AgePipe,
    DurationPipe,
    FrDateTimePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  protected readonly store = inject(AlertStore);

  protected readonly period = signal<Period>(30);
  protected readonly periods: readonly Period[] = [7, 30, 90];

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

  protected isLate(alert: Alert): boolean {
    return isOverdue(alert, PRIORITY_META[alert.priority].slaHours);
  }

  /** Token de couleur du filet de criticité, en tête de ligne. */
  protected priorityColor(alert: Alert): string {
    return PRIORITY_META[alert.priority].colorVar;
  }

  protected scoreBandOf(alert: Alert): string {
    return scoreBand(alert.match.score);
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
