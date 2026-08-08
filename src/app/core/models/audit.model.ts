/**
 * Journal d'audit et fil de commentaires.
 *
 * L'historique est traité comme immuable côté application : aucun écran
 * n'expose de modification ou de suppression d'événement. Les entrées sont
 * uniquement ajoutées, en tête de liste.
 */

import type { UserLevel } from './user.model';

export type AuditAction =
  | 'ALERT_GENERATED'
  | 'ALERT_VIEWED'
  | 'ALERT_ASSIGNED'
  | 'ALERT_UNASSIGNED'
  | 'STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'ALIAS_SELECTED'
  | 'DECISION_TAKEN'
  | 'ESCALATED'
  | 'ALERT_REOPENED'
  | 'PROFILE_REFRESHED';

export interface AuditActionMeta {
  readonly label: string;
  readonly icon: string;
  readonly variant: string;
}

export const AUDIT_ACTION_META: Record<AuditAction, AuditActionMeta> = {
  ALERT_GENERATED: { label: 'Alerte générée', icon: 'radar', variant: 'info' },
  ALERT_VIEWED: { label: 'Alerte consultée', icon: 'eye', variant: 'neutral' },
  ALERT_ASSIGNED: { label: 'Alerte affectée', icon: 'user-check', variant: 'accent' },
  ALERT_UNASSIGNED: { label: 'Affectation retirée', icon: 'user-minus', variant: 'neutral' },
  STATUS_CHANGED: { label: 'Statut modifié', icon: 'arrow-right', variant: 'info' },
  COMMENT_ADDED: { label: 'Commentaire ajouté', icon: 'message', variant: 'neutral' },
  ALIAS_SELECTED: { label: 'Alias retenu', icon: 'target', variant: 'neutral' },
  DECISION_TAKEN: { label: 'Décision prise', icon: 'gavel', variant: 'success' },
  ESCALATED: { label: 'Escalade niveau 2', icon: 'arrow-up', variant: 'critical' },
  ALERT_REOPENED: { label: 'Alerte rouverte', icon: 'rotate', variant: 'sanction' },
  PROFILE_REFRESHED: { label: 'Fiche actualisée', icon: 'refresh', variant: 'info' },
};

export interface AuditEvent {
  readonly id: string;
  readonly alertId: string;
  readonly timestamp: string;
  readonly action: AuditAction;
  /** Identité de l'auteur. `null` lorsque l'acteur est le moteur de screening. */
  readonly actorId: string | null;
  readonly actorName: string;
  readonly actorRole: string;
  readonly actorLevel: UserLevel | 'SYSTEM';
  readonly previousValue: string | null;
  readonly newValue: string | null;
  readonly comment: string | null;
  /** Adresse d'origine, conservée pour la traçabilité réglementaire. */
  readonly sourceIp?: string;
}

export interface AlertComment {
  readonly id: string;
  readonly alertId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly authorLevel: UserLevel;
  readonly authorHue: number;
  readonly createdAt: string;
  readonly body: string;
  /** Un commentaire porté par une décision est mis en avant dans le fil. */
  readonly pinnedToDecision?: boolean;
}
