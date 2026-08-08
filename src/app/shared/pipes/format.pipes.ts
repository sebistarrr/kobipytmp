import { Pipe, type PipeTransform } from '@angular/core';

/** Formate une date ISO ou « AAAA-MM-JJ » en JJ/MM/AAAA. */
@Pipe({ name: 'frDate' })
export class FrDatePipe implements PipeTransform {
  transform(value: string | null | undefined, fallback = '—'): string {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
}

/** Formate une date ISO en « JJ/MM/AAAA à HH:MM ». */
@Pipe({ name: 'frDateTime' })
export class FrDateTimePipe implements PipeTransform {
  transform(value: string | null | undefined, separator = ' à ', fallback = '—'): string {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    const day = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
    const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
    return `${day}${separator}${time}`;
  }
}

/** Heure seule, au format HH:MM. */
@Pipe({ name: 'frTime' })
export class FrTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
}

/**
 * Ancienneté exprimée en langage courant : « 3 h », « 2 j », « 5 min ».
 * Format volontairement compact, pensé pour les colonnes de tableau.
 */
@Pipe({ name: 'age' })
export class AgePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const from = new Date(value).getTime();
    if (Number.isNaN(from)) return '—';

    const minutes = Math.max(0, Math.floor((Date.now() - from) / 60_000));
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;

    const days = Math.floor(hours / 24);
    if (days < 31) return `${days} j`;

    const months = Math.floor(days / 30);
    return `${months} mois`;
  }
}

/** Ancienneté relative rédigée : « il y a 3 heures ». */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  private static readonly formatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const from = new Date(value).getTime();
    if (Number.isNaN(from)) return '—';

    const seconds = Math.round((from - Date.now()) / 1000);
    const absolute = Math.abs(seconds);

    if (absolute < 60) return "à l'instant";
    if (absolute < 3600) return RelativeTimePipe.formatter.format(Math.round(seconds / 60), 'minute');
    if (absolute < 86_400) return RelativeTimePipe.formatter.format(Math.round(seconds / 3600), 'hour');
    if (absolute < 2_592_000) return RelativeTimePipe.formatter.format(Math.round(seconds / 86_400), 'day');
    return RelativeTimePipe.formatter.format(Math.round(seconds / 2_592_000), 'month');
  }
}

/** Durée en heures rendue lisible : « 4 h 30 », « 2 j 6 h ». */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(hours: number | null | undefined): string {
    if (hours === null || hours === undefined || Number.isNaN(hours)) return '—';
    /* Zéro exact signifie « rien à mesurer », pas « instantané ». */
    if (hours <= 0) return '—';
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 24) {
      const whole = Math.floor(hours);
      const minutes = Math.round((hours - whole) * 60);
      return minutes > 0 ? `${whole} h ${String(minutes).padStart(2, '0')}` : `${whole} h`;
    }
    const days = Math.floor(hours / 24);
    const remainder = Math.round(hours % 24);
    return remainder > 0 ? `${days} j ${remainder} h` : `${days} j`;
  }
}

/** Montant en euros, sans décimales, avec séparateurs de milliers. */
@Pipe({ name: 'eur' })
export class EurPipe implements PipeTransform {
  private static readonly formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return EurPipe.formatter.format(value);
  }
}

/** Nombre formaté à la française (espace insécable comme séparateur). */
@Pipe({ name: 'frNumber' })
export class FrNumberPipe implements PipeTransform {
  private static readonly formatter = new Intl.NumberFormat('fr-FR');

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return FrNumberPipe.formatter.format(value);
  }
}

/** Remplace une valeur vide par un tiret cadratin. */
@Pipe({ name: 'orDash' })
export class OrDashPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }
}
