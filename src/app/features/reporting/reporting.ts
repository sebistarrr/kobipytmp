import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { AlertStore } from '../../core/state/alert-store';
import { ToastService } from '../../core/services/toast.service';
import {
  ALERT_STATUS_META,
  DECISION_META,
  PRIORITY_META,
  SCREENING_TYPE_META,
  processingHours,
  type Alert,
  type Decision,
  type ScreeningType,
} from '../../core/models';
import { AvatarComponent } from '../../shared/ui/avatar/avatar';
import { IconComponent } from '../../shared/ui/icon/icon';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card';
import { AreaChartComponent, type AreaSeries } from '../../shared/ui/charts/area-chart';
import { BarListComponent, type BarItem } from '../../shared/ui/charts/bar-list';
import { DonutChartComponent, type DonutSegment } from '../../shared/ui/charts/donut-chart';
import { DurationPipe, FrDateTimePipe } from '../../shared/pipes/format.pipes';

type Period = 30 | 90 | 180;

interface AnalystRow {
  readonly id: string;
  readonly name: string;
  readonly hue: number;
  readonly level: string;
  readonly processed: number;
  readonly open: number;
  readonly averageHours: number;
  readonly confirmedRate: number;
  readonly slaRate: number;
}

/**
 * Reporting de pilotage.
 *
 * Destiné au responsable conformité : volumétrie, tenue des délais, qualité
 * des décisions et charge par analyste. Toutes les mesures portent sur la
 * filiale active.
 */
@Component({
  selector: 'app-reporting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reporting.html',
  styleUrl: './reporting.scss',
  imports: [
    PageHeaderComponent,
    KpiCardComponent,
    IconComponent,
    AvatarComponent,
    AreaChartComponent,
    DonutChartComponent,
    BarListComponent,
    DurationPipe,
    FrDateTimePipe,
  ],
})
export class ReportingComponent {
  private readonly toasts = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(AlertStore);

  protected readonly period = signal<Period>(90);
  protected readonly periods: readonly Period[] = [30, 90, 180];

  protected readonly stats = this.store.stats;
  protected readonly subsidiary = this.auth.activeSubsidiary;

  protected readonly periodLabel = computed(() => `${this.period()} derniers jours`);

  /* ---------------------------------------------------------------------------
     Volumétrie
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

  protected readonly totals = computed(() => {
    const points = this.volume();
    const generated = points.reduce((sum, point) => sum + point.generated, 0);
    const processed = points.reduce((sum, point) => sum + point.processed, 0);
    return {
      generated,
      processed,
      /* Taux d'absorption : capacité à traiter le flux entrant sur la période. */
      absorption: generated === 0 ? 100 : Math.round((processed / generated) * 100),
    };
  });

  /* ---------------------------------------------------------------------------
     Qualité des décisions
     ------------------------------------------------------------------------ */

  protected readonly decisionSegments = computed<readonly DonutSegment[]>(() => {
    const stats = this.stats();
    return (['HOMONYM', 'NEUTRALIZED', 'CONFIRMED'] as const).map((decision) => ({
      key: decision,
      label: DECISION_META[decision].label,
      value:
        decision === 'HOMONYM'
          ? stats.homonym
          : decision === 'NEUTRALIZED'
            ? stats.neutralized
            : stats.confirmed,
      tone: `var(${DECISION_META[decision].colorVar})`,
    }));
  });

  /**
   * Taux de faux positifs : part des alertes clôturées sans correspondance
   * avérée. C'est l'indicateur de calibrage du moteur de screening.
   */
  protected readonly falsePositiveRate = computed(() => {
    const stats = this.stats();
    if (stats.processed === 0) return 0;
    return Math.round(((stats.homonym + stats.neutralized) / stats.processed) * 100);
  });

  protected readonly typeSegments = computed<readonly DonutSegment[]>(() =>
    this.store.byType().map(({ type, count }) => ({
      key: type,
      label: SCREENING_TYPE_META[type].label,
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

  /** Volumétrie et taux d'avération par dispositif : où porte le risque réel. */
  protected readonly typePerformance = computed(() =>
    (['SANCTION', 'PEP', 'RCA'] as const).map((type) => {
      const alerts = this.store.alerts().filter((alert) => alert.type === type);
      const processed = alerts.filter((alert) => alert.resolution);
      const confirmed = processed.filter((alert) => alert.resolution?.decision === 'CONFIRMED');
      const durations = processed
        .map((alert) => processingHours(alert))
        .filter((hours): hours is number => hours !== null);

      return {
        type,
        label: SCREENING_TYPE_META[type].label,
        tone: `var(${SCREENING_TYPE_META[type].colorVar})`,
        total: alerts.length,
        processed: processed.length,
        confirmed: confirmed.length,
        confirmedRate: processed.length === 0 ? 0 : Math.round((confirmed.length / processed.length) * 100),
        averageHours:
          durations.length === 0 ? 0 : durations.reduce((sum, h) => sum + h, 0) / durations.length,
      };
    }),
  );

  /* ---------------------------------------------------------------------------
     Charge et performance par analyste
     ------------------------------------------------------------------------ */

  protected readonly analystRows = computed<readonly AnalystRow[]>(() => {
    const alerts = this.store.alerts();
    const subsidiaryId = this.auth.activeSubsidiaryId();

    return this.auth.allUsers
      .filter((user) => user.active && user.subsidiaryId === subsidiaryId && user.level !== 'ADMIN')
      .map((user) => {
        const decided = alerts.filter((alert) => alert.resolution?.decidedById === user.id);
        const open = alerts.filter(
          (alert) => alert.status !== 'PROCESSED' && alert.assignment?.userId === user.id,
        );

        const durations = decided
          .map((alert) => processingHours(alert))
          .filter((hours): hours is number => hours !== null);

        const confirmed = decided.filter((alert) => alert.resolution?.decision === 'CONFIRMED');
        const onTime = decided.filter((alert) => this.withinSla(alert));

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          hue: user.avatarHue,
          level: user.level === 'LEVEL_1' ? 'Niveau 1' : 'Niveau 2',
          processed: decided.length,
          open: open.length,
          averageHours:
            durations.length === 0 ? 0 : durations.reduce((sum, h) => sum + h, 0) / durations.length,
          confirmedRate:
            decided.length === 0 ? 0 : Math.round((confirmed.length / decided.length) * 100),
          slaRate: decided.length === 0 ? 100 : Math.round((onTime.length / decided.length) * 100),
        };
      })
      .sort((a, b) => b.processed - a.processed);
  });

  private withinSla(alert: Alert): boolean {
    const hours = processingHours(alert);
    if (hours === null) return false;
    return hours <= PRIORITY_META[alert.priority].slaHours;
  }

  protected readonly slaRate = computed(() => {
    const processed = this.store.processedAlerts();
    if (processed.length === 0) return 100;
    return Math.round(
      (processed.filter((alert) => this.withinSla(alert)).length / processed.length) * 100,
    );
  });

  protected readonly maxProcessed = computed(() =>
    Math.max(...this.analystRows().map((row) => row.processed), 1),
  );

  /* ---------------------------------------------------------------------------
     Export
     ------------------------------------------------------------------------ */

  protected readonly canExport = computed(() => this.auth.has('reporting:export'));

  /**
   * Génère un export CSV côté navigateur. Dans un déploiement réel, l'export
   * serait produit par le backend, seul à même de garantir que les données
   * exportées correspondent aux habilitations de l'utilisateur.
   */
  protected exportCsv(): void {
    const rows = [
      [
        'Référence',
        'Type',
        'Statut',
        'Priorité',
        'Client',
        'Référence client',
        'Personne listée',
        'Score',
        'Générée le',
        'Décision',
        'Décidée par',
        'Décidée le',
        'Durée (h)',
      ],
      ...this.store.alerts().map((alert) => [
        alert.reference,
        SCREENING_TYPE_META[alert.type].label,
        ALERT_STATUS_META[alert.status].label,
        PRIORITY_META[alert.priority].label,
        `${alert.client.firstName} ${alert.client.lastName}`,
        alert.client.reference,
        `${alert.profile.firstName} ${alert.profile.lastName}`,
        String(alert.match.score),
        alert.generatedAt,
        alert.resolution ? DECISION_META[alert.resolution.decision].label : '',
        alert.resolution?.decidedByName ?? '',
        alert.resolution?.decidedAt ?? '',
        alert.resolution ? (processingHours(alert) ?? 0).toFixed(1) : '',
      ]),
    ];

    /* Séparateur point-virgule et BOM : Excel en locale française ouvre le
       fichier correctement, sans passer par l'assistant d'importation. */
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vigilance-${this.subsidiary().code}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.toasts.success(
      'Export généré',
      `${this.store.alerts().length} alertes exportées pour ${this.subsidiary().name}.`,
    );
  }

  protected decisionLabel(decision: Decision): string {
    return DECISION_META[decision].label;
  }

  protected typeLabel(type: ScreeningType): string {
    return SCREENING_TYPE_META[type].label;
  }
}
