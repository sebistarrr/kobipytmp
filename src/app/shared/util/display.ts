import {
  COMPARISON_RESULT_META,
  PRIORITY_META,
  isOverdue,
  type Alert,
  type ComparisonResult,
  type MatchAttribute,
} from '../../core/models';
import type { IconName } from '../ui/icon/icon';

const FR_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Vrai pour une chaîne du type « AAAA-MM-JJ ». */
function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

/**
 * Met en forme une valeur du comparateur pour l'affichage.
 *
 * Les dates sont stockées au format ISO dans le modèle — c'est ce qui permet
 * de les comparer et de les trier de façon fiable — mais un analyste français
 * lit « 12/04/1978 ». La conversion se fait donc au seul moment du rendu.
 */
export function formatComparisonValue(
  attribute: MatchAttribute,
  value: string | null,
): string | null {
  if (value === null || value === '') return null;
  if (attribute === 'birthDate' && isIsoDate(value)) {
    return FR_DATE.format(new Date(value));
  }
  return value;
}

/**
 * Icône associée à un résultat de comparaison.
 *
 * Le modèle décrit le pictogramme de façon abstraite (`check`, `cross`, …)
 * pour ne pas dépendre de la bibliothèque d'icônes ; la traduction vers un
 * nom d'icône concret est faite ici, une seule fois.
 */
export function comparisonIcon(result: ComparisonResult): IconName {
  switch (COMPARISON_RESULT_META[result].icon) {
    case 'check':
      return 'check';
    case 'approx':
      return 'approx';
    case 'cross':
      return 'x';
    case 'minus':
      return 'minus';
    case 'question':
      return 'question';
  }
}

/** Délai de traitement attendu pour la priorité de l'alerte, en heures. */
export function slaHoursFor(alert: Alert): number {
  return PRIORITY_META[alert.priority].slaHours;
}

/** Vrai lorsque l'alerte dépasse le délai attendu de sa priorité. */
export function isAlertLate(alert: Alert): boolean {
  return isOverdue(alert, slaHoursFor(alert));
}

/** Token de couleur de la priorité, utilisé pour le filet de criticité. */
export function priorityColorVar(alert: Alert): string {
  return PRIORITY_META[alert.priority].colorVar;
}
