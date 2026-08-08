import { Injectable, computed, inject, signal } from '@angular/core';

import {
  ALERT_STATUS_META,
  DECISION_META,
  PRIORITY_META,
  alertAgeHours,
  isOverdue,
  processingHours,
  type Alert,
  type AlertComment,
  type AlertStatus,
  type AuditAction,
  type AuditEvent,
  type Decision,
  type ScreeningType,
} from '../models';
import { ALERTS } from '../data/alerts.data';
import { AUDIT_BY_ALERT, COMMENTS_BY_ALERT } from '../data/activity.data';
import { AuthService } from '../auth/auth.service';

/** Latence simulée, pour que les états de chargement soient réellement visibles. */
const LATENCY_MS = 420;

let auditSequence = 900_000;
let commentSequence = 900_000;

/**
 * Source de vérité des alertes côté client.
 *
 * Toutes les mutations passent par ce service, et chacune écrit son propre
 * événement d'audit : il est impossible de modifier une alerte sans laisser de
 * trace. Le journal n'expose ni modification ni suppression — il ne fait que
 * croître.
 */
@Injectable({ providedIn: 'root' })
export class AlertStore {
  private readonly auth = inject(AuthService);

  private readonly _alerts = signal<readonly Alert[]>(ALERTS);
  private readonly _comments = signal<ReadonlyMap<string, readonly AlertComment[]>>(COMMENTS_BY_ALERT);
  private readonly _audit = signal<ReadonlyMap<string, readonly AuditEvent[]>>(AUDIT_BY_ALERT);

  private readonly _loading = signal(true);
  private readonly _lastRefreshedAt = signal(new Date().toISOString());

  readonly loading = this._loading.asReadonly();
  readonly lastRefreshedAt = this._lastRefreshedAt.asReadonly();

  /** Toutes les alertes, tous périmètres confondus. */
  readonly allAlerts = this._alerts.asReadonly();

  /** Alertes du périmètre actif — la base de tous les écrans métier. */
  readonly alerts = computed(() => {
    const subsidiaryId = this.auth.activeSubsidiaryId();
    return this._alerts().filter((alert) => alert.subsidiaryId === subsidiaryId);
  });

  readonly openAlerts = computed(() => this.alerts().filter((alert) => alert.status !== 'PROCESSED'));

  readonly processedAlerts = computed(() =>
    this.alerts().filter((alert) => alert.status === 'PROCESSED'),
  );

  readonly unassignedAlerts = computed(() =>
    this.alerts().filter((alert) => alert.status !== 'PROCESSED' && !alert.assignment),
  );

  readonly myAlerts = computed(() => {
    const userId = this.auth.currentUser().id;
    return this.alerts().filter(
      (alert) => alert.status !== 'PROCESSED' && alert.assignment?.userId === userId,
    );
  });

  /** Alertes hors délai au regard du niveau de service de leur priorité. */
  readonly overdueAlerts = computed(() =>
    this.openAlerts().filter((alert) => isOverdue(alert, PRIORITY_META[alert.priority].slaHours)),
  );

  constructor() {
    this.refresh();
  }

  /* ---------------------------------------------------------------------------
     Lecture
     ------------------------------------------------------------------------ */

  byId(alertId: string): Alert | undefined {
    return this._alerts().find((alert) => alert.id === alertId);
  }

  byReference(reference: string): Alert | undefined {
    const needle = reference.toUpperCase();
    return this._alerts().find((alert) => alert.reference.toUpperCase() === needle);
  }

  commentsFor(alertId: string): readonly AlertComment[] {
    return this._comments().get(alertId) ?? [];
  }

  auditFor(alertId: string): readonly AuditEvent[] {
    return this._audit().get(alertId) ?? [];
  }

  /** Alertes voisines dans la file, pour la navigation « suivante / précédente ». */
  queueNeighbours(alertId: string): { previous: Alert | null; next: Alert | null; index: number; total: number } {
    const queue = this.openAlerts();
    const index = queue.findIndex((alert) => alert.id === alertId);
    if (index === -1) return { previous: null, next: null, index: -1, total: queue.length };
    return {
      previous: index > 0 ? queue[index - 1]! : null,
      next: index < queue.length - 1 ? queue[index + 1]! : null,
      index,
      total: queue.length,
    };
  }

  /* ---------------------------------------------------------------------------
     Chargement
     ------------------------------------------------------------------------ */

  refresh(): void {
    this._loading.set(true);
    setTimeout(() => {
      this._loading.set(false);
      this._lastRefreshedAt.set(new Date().toISOString());
    }, LATENCY_MS);
  }

  /* ---------------------------------------------------------------------------
     Mutations — chacune produit son événement d'audit
     ------------------------------------------------------------------------ */

  /** Affecte l'alerte à un analyste, ou retire l'affectation avec `null`. */
  assign(alertId: string, userId: string | null): void {
    const alert = this.byId(alertId);
    if (!alert) return;

    const previous = alert.assignment?.userName ?? 'Non affectée';
    const actor = this.auth.currentUser();
    const now = new Date().toISOString();

    if (userId === null) {
      this.patch(alertId, {
        assignment: null,
        status: alert.status === 'ASSIGNED' ? 'TO_PROCESS' : alert.status,
        lastActionLabel: 'Affectation retirée',
        lastActionAt: now,
      });
      this.appendAudit(alertId, 'ALERT_UNASSIGNED', {
        previousValue: previous,
        newValue: 'Non affectée',
        comment: null,
      });
      return;
    }

    const target = this.auth.allUsers.find((user) => user.id === userId);
    if (!target) return;

    this.patch(alertId, {
      assignment: {
        userId: target.id,
        userName: `${target.firstName} ${target.lastName}`,
        userLevel: target.level,
        userHue: target.avatarHue,
        assignedAt: now,
        assignedByName: `${actor.firstName} ${actor.lastName}`,
      },
      status: alert.status === 'TO_PROCESS' ? 'ASSIGNED' : alert.status,
      lastActionLabel: 'Alerte affectée',
      lastActionAt: now,
    });

    this.appendAudit(alertId, 'ALERT_ASSIGNED', {
      previousValue: previous,
      newValue: `${target.firstName} ${target.lastName}`,
      comment: target.id === actor.id ? "Prise en charge par l'analyste." : null,
    });
  }

  /** Marque l'alerte comme en cours dès que l'analyste affecté l'ouvre. */
  markInProgress(alertId: string): void {
    const alert = this.byId(alertId);
    if (!alert) return;
    if (alert.status !== 'ASSIGNED') return;
    if (alert.assignment?.userId !== this.auth.currentUser().id) return;

    this.patch(alertId, { status: 'IN_PROGRESS', lastActionAt: new Date().toISOString() });
    this.appendAudit(alertId, 'STATUS_CHANGED', {
      previousValue: ALERT_STATUS_META.ASSIGNED.label,
      newValue: ALERT_STATUS_META.IN_PROGRESS.label,
      comment: null,
    });
  }

  addComment(alertId: string, body: string): void {
    const trimmed = body.trim();
    if (!trimmed) return;

    const alert = this.byId(alertId);
    if (!alert) return;

    const actor = this.auth.currentUser();
    const now = new Date().toISOString();

    const comment: AlertComment = {
      id: `CMT-${commentSequence++}`,
      alertId,
      authorId: actor.id,
      authorName: `${actor.firstName} ${actor.lastName}`,
      authorRole: this.auth.levelMeta().label,
      authorLevel: actor.level,
      authorHue: actor.avatarHue,
      createdAt: now,
      body: trimmed,
    };

    this._comments.update((map) => {
      const next = new Map(map);
      next.set(alertId, [...(map.get(alertId) ?? []), comment]);
      return next;
    });

    this.patch(alertId, {
      commentCount: alert.commentCount + 1,
      lastActionLabel: 'Commentaire ajouté',
      lastActionAt: now,
    });

    this.appendAudit(alertId, 'COMMENT_ADDED', {
      previousValue: null,
      newValue: null,
      comment: trimmed,
    });
  }

  /** Mémorise l'alias retenu par l'analyste comme base de comparaison. */
  retainAlias(alertId: string, aliasId: string): void {
    const alert = this.byId(alertId);
    if (!alert || alert.match.matchedAliasId === aliasId) return;

    const previous = alert.profile.aliases.find((a) => a.id === alert.match.matchedAliasId);
    const next = alert.profile.aliases.find((a) => a.id === aliasId);
    if (!next) return;

    this.patch(alertId, { match: { ...alert.match, matchedAliasId: aliasId } });
    this.appendAudit(alertId, 'ALIAS_SELECTED', {
      previousValue: previous?.fullName ?? null,
      newValue: `${next.fullName} (${next.score} %)`,
      comment: null,
    });
  }

  /** Escalade au niveau 2. Le commentaire est obligatoire côté appelant. */
  escalate(alertId: string, comment: string): void {
    const alert = this.byId(alertId);
    if (!alert) return;

    const now = new Date().toISOString();
    this.patch(alertId, {
      status: 'ESCALATED',
      lastActionLabel: 'Escalade niveau 2',
      lastActionAt: now,
    });

    this.appendAudit(alertId, 'ESCALATED', {
      previousValue: 'Niveau 1',
      newValue: 'Niveau 2',
      comment,
    });
  }

  /** Prononce une décision de clôture et fige l'alerte en « traitée ». */
  decide(alertId: string, decision: Decision, comment: string): void {
    const alert = this.byId(alertId);
    if (!alert) return;

    const actor = this.auth.currentUser();
    const meta = DECISION_META[decision];
    const now = new Date().toISOString();

    this.patch(alertId, {
      status: 'PROCESSED',
      resolution: {
        decision,
        decidedById: actor.id,
        decidedByName: `${actor.firstName} ${actor.lastName}`,
        decidedByLevel: actor.level,
        decidedAt: now,
        comment,
        level: meta.requiredLevel,
      },
      lastActionLabel: `Décision : ${meta.label.toLowerCase()}`,
      lastActionAt: now,
    });

    this.appendAudit(alertId, 'DECISION_TAKEN', {
      previousValue: ALERT_STATUS_META[alert.status].label,
      newValue: `${ALERT_STATUS_META.PROCESSED.label} — ${meta.label}`,
      comment,
    });
  }

  /** Rouvre une alerte traitée. La décision précédente reste au journal. */
  reopen(alertId: string, reason: string): void {
    const alert = this.byId(alertId);
    if (!alert || alert.status !== 'PROCESSED') return;

    const now = new Date().toISOString();
    const previousDecision = alert.resolution
      ? `${ALERT_STATUS_META.PROCESSED.label} — ${DECISION_META[alert.resolution.decision].label}`
      : ALERT_STATUS_META.PROCESSED.label;

    this.patch(alertId, {
      status: 'REOPENED',
      resolution: null,
      reopenCount: alert.reopenCount + 1,
      lastActionLabel: 'Alerte rouverte',
      lastActionAt: now,
    });

    this.appendAudit(alertId, 'ALERT_REOPENED', {
      previousValue: previousDecision,
      newValue: ALERT_STATUS_META.REOPENED.label,
      comment: reason,
    });
  }

  /* ---------------------------------------------------------------------------
     Statistiques du périmètre actif
     ------------------------------------------------------------------------ */

  readonly stats = computed(() => {
    const alerts = this.alerts();
    const open = alerts.filter((alert) => alert.status !== 'PROCESSED');
    const processed = alerts.filter((alert) => alert.status === 'PROCESSED');

    const durations = processed
      .map((alert) => processingHours(alert))
      .filter((hours): hours is number => hours !== null);

    const averageHours =
      durations.length > 0 ? durations.reduce((sum, h) => sum + h, 0) / durations.length : 0;

    return {
      total: alerts.length,
      open: open.length,
      toProcess: alerts.filter((alert) => alert.status === 'TO_PROCESS').length,
      assigned: alerts.filter((alert) => alert.status === 'ASSIGNED').length,
      inProgress: alerts.filter((alert) => alert.status === 'IN_PROGRESS').length,
      escalated: alerts.filter((alert) => alert.status === 'ESCALATED').length,
      reopened: alerts.filter((alert) => alert.status === 'REOPENED').length,
      processed: processed.length,
      confirmed: processed.filter((alert) => alert.resolution?.decision === 'CONFIRMED').length,
      neutralized: processed.filter((alert) => alert.resolution?.decision === 'NEUTRALIZED').length,
      homonym: processed.filter((alert) => alert.resolution?.decision === 'HOMONYM').length,
      overdue: this.overdueAlerts().length,
      averageProcessingHours: averageHours,
      generatedLast7Days: alerts.filter((alert) => alertAgeHours(alert) <= 168).length,
    };
  });

  /** Répartition par type de dispositif, pour le graphique du tableau de bord. */
  readonly byType = computed<readonly { type: ScreeningType; count: number }[]>(() => {
    const alerts = this.alerts();
    return (['SANCTION', 'PEP', 'RCA'] as const).map((type) => ({
      type,
      count: alerts.filter((alert) => alert.type === type).length,
    }));
  });

  readonly byStatus = computed<readonly { status: AlertStatus; count: number }[]>(() => {
    const alerts = this.alerts();
    return (
      ['TO_PROCESS', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'PROCESSED', 'REOPENED'] as const
    ).map((status) => ({
      status,
      count: alerts.filter((alert) => alert.status === status).length,
    }));
  });

  /**
   * Volume d'alertes générées et traitées par jour sur la période demandée.
   * Alimente la courbe d'évolution du tableau de bord.
   */
  volumeSeries(days: number): readonly { date: string; generated: number; processed: number }[] {
    const alerts = this.alerts();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return Array.from({ length: days }, (_, offset) => {
      const dayEnd = new Date(today.getTime() - (days - 1 - offset) * 86_400_000);
      const dayStart = new Date(dayEnd);
      dayStart.setHours(0, 0, 0, 0);

      const within = (iso: string) => {
        const time = new Date(iso).getTime();
        return time >= dayStart.getTime() && time <= dayEnd.getTime();
      };

      return {
        date: dayStart.toISOString(),
        generated: alerts.filter((alert) => within(alert.generatedAt)).length,
        processed: alerts.filter((alert) => alert.resolution && within(alert.resolution.decidedAt)).length,
      };
    });
  }

  /* ---------------------------------------------------------------------------
     Écriture interne
     ------------------------------------------------------------------------ */

  private patch(alertId: string, changes: Partial<Alert>): void {
    this._alerts.update((alerts) =>
      alerts.map((alert) => (alert.id === alertId ? { ...alert, ...changes } : alert)),
    );
  }

  private appendAudit(
    alertId: string,
    action: AuditAction,
    payload: { previousValue: string | null; newValue: string | null; comment: string | null },
  ): void {
    const actor = this.auth.currentUser();
    const event: AuditEvent = {
      id: `EVT-${auditSequence++}`,
      alertId,
      timestamp: new Date().toISOString(),
      action,
      actorId: actor.id,
      actorName: `${actor.firstName} ${actor.lastName}`,
      actorRole: this.auth.levelMeta().label,
      actorLevel: actor.level,
      sourceIp: '10.24.8.114',
      ...payload,
    };

    this._audit.update((map) => {
      const next = new Map(map);
      next.set(alertId, [event, ...(map.get(alertId) ?? [])]);
      return next;
    });
  }
}
