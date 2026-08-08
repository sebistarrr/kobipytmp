/**
 * Référentiel métier LCB-FT.
 *
 * Tous les libellés, variantes de badge et ordres de tri des énumérations sont
 * centralisés ici : c'est la seule source de vérité pour l'affichage d'un
 * statut, d'un type de screening, d'une priorité ou d'une décision. Aucun
 * composant ne doit redéfinir un libellé localement.
 */

/* -----------------------------------------------------------------------------
   Dispositif de screening à l'origine de l'alerte
   -------------------------------------------------------------------------- */
export type ScreeningType = 'SANCTION' | 'PEP' | 'RCA';

export const SCREENING_TYPES: readonly ScreeningType[] = ['SANCTION', 'PEP', 'RCA'] as const;

export interface ScreeningTypeMeta {
  readonly label: string;
  /** Libellé long, utilisé en tooltip et sur les écrans d'investigation. */
  readonly fullLabel: string;
  readonly description: string;
  readonly variant: string;
  /** Nom du token CSS de couleur, pour les graphiques. */
  readonly colorVar: string;
}

export const SCREENING_TYPE_META: Record<ScreeningType, ScreeningTypeMeta> = {
  SANCTION: {
    label: 'Sanction',
    fullLabel: 'Liste de sanctions',
    description:
      "Correspondance avec une personne ou une entité figurant sur une liste de sanctions internationales (UE, OFAC, ONU, HM Treasury).",
    variant: 'sanction',
    colorVar: '--sanction',
  },
  PEP: {
    label: 'PEP',
    fullLabel: 'Personne politiquement exposée',
    description:
      "Correspondance avec une personne exerçant ou ayant exercé une fonction publique importante, soumise à une vigilance renforcée.",
    variant: 'pep',
    colorVar: '--pep',
  },
  RCA: {
    label: 'RCA',
    fullLabel: 'Proche ou associé d’une personne listée',
    description:
      "Correspondance avec un membre de la famille ou un associé proche d'une personne politiquement exposée ou sanctionnée.",
    variant: 'rca',
    colorVar: '--rca',
  },
};

/* -----------------------------------------------------------------------------
   Statut de l'alerte dans le workflow
   -------------------------------------------------------------------------- */
export type AlertStatus =
  | 'TO_PROCESS'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ESCALATED'
  | 'PROCESSED'
  | 'REOPENED';

export const ALERT_STATUSES: readonly AlertStatus[] = [
  'TO_PROCESS',
  'ASSIGNED',
  'IN_PROGRESS',
  'ESCALATED',
  'PROCESSED',
  'REOPENED',
] as const;


export interface AlertStatusMeta {
  readonly label: string;
  readonly description: string;
  readonly variant: string;
  readonly colorVar: string;
}

export const ALERT_STATUS_META: Record<AlertStatus, AlertStatusMeta> = {
  TO_PROCESS: {
    label: 'À traiter',
    description: "Alerte générée par le moteur de screening, en attente de prise en charge.",
    variant: 'info',
    colorVar: '--info',
  },
  ASSIGNED: {
    label: 'Affectée',
    description: 'Alerte attribuée à un analyste mais non encore ouverte.',
    variant: 'accent',
    colorVar: '--accent',
  },
  IN_PROGRESS: {
    label: 'En cours',
    description: "Analyse en cours par l'analyste affecté.",
    variant: 'warning',
    colorVar: '--warning',
  },
  ESCALATED: {
    label: 'Escaladée',
    description: 'Transmise au niveau 2 pour décision réglementaire.',
    variant: 'critical',
    colorVar: '--critical',
  },
  PROCESSED: {
    label: 'Traitée',
    description: 'Décision prise et enregistrée dans le registre d’audit.',
    variant: 'success',
    colorVar: '--success',
  },
  REOPENED: {
    label: 'Rouverte',
    description: "Alerte précédemment traitée, rouverte à la suite d'un élément nouveau.",
    variant: 'sanction',
    colorVar: '--sanction',
  },
};

/* -----------------------------------------------------------------------------
   Priorité — dérivée du score de rapprochement et du type de dispositif
   -------------------------------------------------------------------------- */
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const PRIORITIES: readonly Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

export interface PriorityMeta {
  readonly label: string;
  readonly variant: string;
  readonly colorVar: string;
  /** Poids de tri : plus la valeur est élevée, plus l'alerte remonte. */
  readonly weight: number;
  /** Délai de traitement attendu, en heures. */
  readonly slaHours: number;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  CRITICAL: { label: 'Critique', variant: 'critical', colorVar: '--critical', weight: 4, slaHours: 4 },
  HIGH: { label: 'Élevée', variant: 'warning', colorVar: '--warning', weight: 3, slaHours: 24 },
  MEDIUM: { label: 'Moyenne', variant: 'info', colorVar: '--info', weight: 2, slaHours: 72 },
  LOW: { label: 'Faible', variant: 'neutral', colorVar: '--neutral', weight: 1, slaHours: 168 },
};

/* -----------------------------------------------------------------------------
   Décisions de clôture
   -------------------------------------------------------------------------- */
export type Decision = 'HOMONYM' | 'NEUTRALIZED' | 'CONFIRMED';

export const DECISIONS: readonly Decision[] = ['HOMONYM', 'NEUTRALIZED', 'CONFIRMED'] as const;

export interface DecisionMeta {
  readonly label: string;
  /** Formulation à l'impératif, utilisée sur les boutons d'action. */
  readonly actionLabel: string;
  readonly description: string;
  /** Ce que la décision déclenche concrètement — affiché avant validation. */
  readonly consequence: string;
  readonly variant: string;
  readonly colorVar: string;
  /** Niveau habilité à prononcer cette décision. */
  readonly requiredLevel: 1 | 2;
}

export const DECISION_META: Record<Decision, DecisionMeta> = {
  HOMONYM: {
    label: 'Homonyme',
    actionLabel: 'Homonyme — aucun risque',
    description:
      "Les éléments d'identification disponibles permettent d'écarter la correspondance avec la personne listée.",
    consequence:
      "L'alerte est clôturée sans suite. Aucune mesure de vigilance renforcée n'est déclenchée sur le client.",
    variant: 'success',
    colorVar: '--success',
    requiredLevel: 1,
  },
  NEUTRALIZED: {
    label: 'Neutralisée',
    actionLabel: "Neutraliser l'alerte",
    description:
      "Après analyse approfondie, la correspondance n'est pas avérée. L'alerte ne constitue pas un rapprochement valide.",
    consequence:
      "L'alerte est clôturée après analyse de niveau 2. Le rapprochement est mémorisé afin de limiter la régénération d'alertes identiques.",
    variant: 'success',
    colorVar: '--success',
    requiredLevel: 2,
  },
  CONFIRMED: {
    label: 'Avérée',
    actionLabel: "Avérer l'alerte",
    description:
      'La correspondance est confirmée. Le client correspond bien à la personne listée par le dispositif de screening.',
    consequence:
      "Le client est classé en vigilance renforcée, la relation d'affaires est gelée dans l'attente d'un arbitrage conformité, et un dossier de déclaration de soupçon est ouvert.",
    variant: 'critical',
    colorVar: '--critical',
    requiredLevel: 2,
  },
};

/* -----------------------------------------------------------------------------
   Résultat de comparaison attribut par attribut
   -------------------------------------------------------------------------- */
export type ComparisonResult = 'MATCH' | 'PARTIAL' | 'DIVERGENCE' | 'MISSING' | 'UNCERTAIN';

export interface ComparisonResultMeta {
  readonly label: string;
  readonly variant: string;
  readonly colorVar: string;
  readonly icon: 'check' | 'approx' | 'cross' | 'minus' | 'question';
}

export const COMPARISON_RESULT_META: Record<ComparisonResult, ComparisonResultMeta> = {
  MATCH: { label: 'Correspondance', variant: 'success', colorVar: '--success', icon: 'check' },
  PARTIAL: { label: 'Partielle', variant: 'warning', colorVar: '--warning', icon: 'approx' },
  DIVERGENCE: { label: 'Divergence', variant: 'critical', colorVar: '--critical', icon: 'cross' },
  MISSING: { label: 'Non renseigné', variant: 'neutral', colorVar: '--neutral', icon: 'minus' },
  UNCERTAIN: { label: 'Incertain', variant: 'info', colorVar: '--info', icon: 'question' },
};

/* -----------------------------------------------------------------------------
   Seuils de score de rapprochement
   -------------------------------------------------------------------------- */
export type ScoreBand = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return 'VERY_HIGH';
  if (score >= 75) return 'HIGH';
  if (score >= 55) return 'MODERATE';
  return 'LOW';
}

export const SCORE_BAND_META: Record<ScoreBand, { label: string; variant: string; colorVar: string }> = {
  VERY_HIGH: { label: 'Très élevé', variant: 'critical', colorVar: '--critical' },
  HIGH: { label: 'Élevé', variant: 'warning', colorVar: '--warning' },
  MODERATE: { label: 'Modéré', variant: 'info', colorVar: '--info' },
  LOW: { label: 'Faible', variant: 'neutral', colorVar: '--neutral' },
};

/** Priorité déduite du score et du dispositif — la même règle que le moteur. */
export function derivePriority(score: number, type: ScreeningType): Priority {
  if (type === 'SANCTION') {
    if (score >= 88) return 'CRITICAL';
    if (score >= 72) return 'HIGH';
    return score >= 55 ? 'MEDIUM' : 'LOW';
  }
  if (score >= 92) return 'CRITICAL';
  if (score >= 78) return 'HIGH';
  return score >= 58 ? 'MEDIUM' : 'LOW';
}
