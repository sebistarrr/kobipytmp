import type { MatchAttribute } from '../../core/models';

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
