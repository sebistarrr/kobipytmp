/**
 * L'alerte : l'objet central de la plateforme. Elle relie un client de la
 * filiale à une fiche de personne listée, porte le détail du rapprochement
 * calculé par le moteur, et suit son propre cycle de vie dans le workflow.
 */

import type { AlertStatus, ComparisonResult, Decision, Priority, ScreeningType } from './reference.model';
import type { Client, ScreeningProfile } from './party.model';

/** Attributs confrontés par le comparateur, dans l'ordre d'affichage. */
export type MatchAttribute =
  | 'lastName'
  | 'firstName'
  | 'birthDate'
  | 'nationality'
  | 'residenceCountry'
  | 'address'
  | 'birthPlace'
  | 'occupation';

export const MATCH_ATTRIBUTE_LABELS: Record<MatchAttribute, string> = {
  lastName: 'Nom',
  firstName: 'Prénom',
  birthDate: 'Date de naissance',
  nationality: 'Nationalité',
  residenceCountry: 'Pays de résidence',
  address: 'Adresse',
  birthPlace: 'Lieu de naissance',
  occupation: 'Profession',
};

/**
 * Contribution d'un attribut au score global. Le poids permet à l'analyste de
 * comprendre pourquoi une divergence d'adresse pèse moins qu'une divergence de
 * date de naissance.
 */
export interface MatchCriterion {
  readonly attribute: MatchAttribute;
  readonly score: number;
  /** Poids de l'attribut dans le score global, en % (somme = 100). */
  readonly weight: number;
  readonly result: ComparisonResult;
  /** Explication en clair du calcul, affichée au survol. */
  readonly rationale: string;
}

/** Une ligne du comparateur client / fiche listée. */
export interface ComparisonRow {
  readonly attribute: MatchAttribute;
  readonly label: string;
  readonly clientValue: string | null;
  readonly profileValue: string | null;
  readonly result: ComparisonResult;
  readonly score: number;
  readonly weight: number;
  readonly rationale: string;
}

export interface MatchDetail {
  /** Score global de rapprochement, en %. */
  readonly score: number;
  readonly criteria: readonly MatchCriterion[];
  /** Identifiant de l'alias de la fiche ayant produit le meilleur score. */
  readonly matchedAliasId: string;
  readonly algorithm: string;
  readonly computedAt: string;
}

export interface AlertAssignment {
  readonly userId: string;
  readonly userName: string;
  readonly userLevel: 'LEVEL_1' | 'LEVEL_2' | 'ADMIN';
  readonly userHue: number;
  readonly assignedAt: string;
  readonly assignedByName: string;
}

export interface AlertResolution {
  readonly decision: Decision;
  readonly decidedById: string;
  readonly decidedByName: string;
  readonly decidedByLevel: 'LEVEL_1' | 'LEVEL_2' | 'ADMIN';
  readonly decidedAt: string;
  readonly comment: string;
  /** Niveau ayant prononcé la décision : 1 pour l'homonymie, 2 sinon. */
  readonly level: 1 | 2;
}

export interface Alert {
  readonly id: string;
  /** Référence métier lisible, du type A-82931. */
  readonly reference: string;
  readonly type: ScreeningType;
  readonly status: AlertStatus;
  readonly priority: Priority;
  readonly subsidiaryId: string;

  readonly client: Client;
  readonly profile: ScreeningProfile;
  readonly match: MatchDetail;

  readonly generatedAt: string;
  readonly assignment: AlertAssignment | null;
  readonly resolution: AlertResolution | null;

  /** Résumé de la dernière action, affiché en colonne d'inbox. */
  readonly lastActionLabel: string;
  readonly lastActionAt: string;

  readonly commentCount: number;
  /** Nombre de fois que l'alerte a été rouverte après clôture. */
  readonly reopenCount: number;
  /** Nom du scénario de screening ayant déclenché l'alerte. */
  readonly triggeredBy: string;
  readonly batchId: string;
}

/* -----------------------------------------------------------------------------
   Calculs dérivés — sans effet de bord, réutilisables partout
   -------------------------------------------------------------------------- */

/** Âge de l'alerte en heures depuis sa génération. */
export function alertAgeHours(alert: Alert, now: Date = new Date()): number {
  return (now.getTime() - new Date(alert.generatedAt).getTime()) / 3_600_000;
}

/** Durée de traitement en heures, de la génération à la décision. */
export function processingHours(alert: Alert): number | null {
  if (!alert.resolution) return null;
  const from = new Date(alert.generatedAt).getTime();
  const to = new Date(alert.resolution.decidedAt).getTime();
  return (to - from) / 3_600_000;
}

/** Une alerte est en retard lorsqu'elle dépasse le délai attendu de sa priorité. */
export function isOverdue(alert: Alert, slaHours: number, now: Date = new Date()): boolean {
  if (alert.resolution) return false;
  return alertAgeHours(alert, now) > slaHours;
}

/** Construit les lignes du comparateur à partir du client et de la fiche. */
export function buildComparisonRows(
  client: Client,
  profile: ScreeningProfile,
  criteria: readonly MatchCriterion[],
  overrides?: Partial<Record<MatchAttribute, string | null>>,
): ComparisonRow[] {
  const clientValues: Record<MatchAttribute, string | null> = {
    lastName: client.lastName,
    firstName: client.firstName,
    birthDate: client.birthDate,
    nationality: client.nationality,
    residenceCountry: client.residenceCountry,
    address: client.address ? `${client.address.city}, ${client.address.country}` : null,
    birthPlace: client.birthPlace,
    occupation: client.occupation,
  };

  const profileValues: Record<MatchAttribute, string | null> = {
    lastName: profile.lastName,
    firstName: profile.firstName,
    birthDate: profile.birthDate,
    nationality: profile.nationality,
    residenceCountry: profile.countries[0] ?? null,
    address: profile.address ? `${profile.address.city}, ${profile.address.country}` : null,
    birthPlace: profile.birthPlace,
    occupation: profile.positions[0]?.title ?? null,
  };

  return criteria.map((criterion) => ({
    attribute: criterion.attribute,
    label: MATCH_ATTRIBUTE_LABELS[criterion.attribute],
    clientValue: clientValues[criterion.attribute],
    profileValue: overrides?.[criterion.attribute] ?? profileValues[criterion.attribute],
    result: criterion.result,
    score: criterion.score,
    weight: criterion.weight,
    rationale: criterion.rationale,
  }));
}
