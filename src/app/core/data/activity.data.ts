/**
 * Journaux d'audit et fils de commentaires.
 *
 * Les traces sont reconstituées à partir de l'état de chaque alerte, de sorte
 * que l'historique raconte toujours exactement ce qui est visible à l'écran :
 * une alerte escaladée porte un événement d'escalade, une alerte traitée porte
 * sa décision, une alerte rouverte porte les deux plus la réouverture.
 */

import {
  ALERT_STATUS_META,
  DECISION_META,
  type Alert,
  type AlertComment,
  type AuditEvent,
  type UserLevel,
} from '../models';
import { ALERTS } from './alerts.data';

let sequence = 1;

function eventId(): string {
  return `EVT-${String(sequence++).padStart(6, '0')}`;
}

function minutesBefore(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() - minutes * 60_000).toISOString();
}

function roleLabel(level: UserLevel | 'SYSTEM'): string {
  switch (level) {
    case 'LEVEL_1':
      return 'Analyste niveau 1';
    case 'LEVEL_2':
      return 'Analyste niveau 2';
    case 'ADMIN':
      return 'Administrateur conformité';
    case 'SYSTEM':
      return 'Moteur de screening';
  }
}

const SOURCE_IPS = ['10.24.8.114', '10.24.9.201', '10.31.4.77', '10.24.8.66', '10.52.1.13'];

function ipFor(actorId: string | null): string {
  if (!actorId) return '10.0.0.1';
  const index = actorId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % SOURCE_IPS.length;
  return SOURCE_IPS[index]!;
}

/* -----------------------------------------------------------------------------
   Construction du journal d'une alerte
   -------------------------------------------------------------------------- */

function buildAuditTrail(alert: Alert): AuditEvent[] {
  const events: AuditEvent[] = [];

  const push = (event: Omit<AuditEvent, 'id' | 'alertId' | 'sourceIp'> & { sourceIp?: string }) => {
    events.push({
      id: eventId(),
      alertId: alert.id,
      sourceIp: event.sourceIp ?? ipFor(event.actorId),
      ...event,
    });
  };

  /* 1 — Génération par le moteur, toujours le premier événement. */
  push({
    timestamp: alert.generatedAt,
    action: 'ALERT_GENERATED',
    actorId: null,
    actorName: 'Moteur de screening',
    actorRole: roleLabel('SYSTEM'),
    actorLevel: 'SYSTEM',
    previousValue: null,
    newValue: `${alert.type} — score ${alert.match.score} %`,
    comment: `${alert.triggeredBy} · lot ${alert.batchId}`,
    sourceIp: '10.0.0.1',
  });

  /* 2 — Affectation. */
  if (alert.assignment) {
    const selfAssigned = alert.assignment.assignedByName === alert.assignment.userName;
    push({
      timestamp: alert.assignment.assignedAt,
      action: 'ALERT_ASSIGNED',
      actorId: selfAssigned ? alert.assignment.userId : null,
      actorName: alert.assignment.assignedByName,
      actorRole: selfAssigned ? roleLabel(alert.assignment.userLevel) : 'Analyste conformité',
      actorLevel: selfAssigned ? alert.assignment.userLevel : 'LEVEL_1',
      previousValue: 'Non affectée',
      newValue: alert.assignment.userName,
      comment: selfAssigned ? "Prise en charge par l'analyste." : null,
    });

    push({
      timestamp: minutesBefore(alert.assignment.assignedAt, -1),
      action: 'STATUS_CHANGED',
      actorId: alert.assignment.userId,
      actorName: alert.assignment.assignedByName,
      actorRole: roleLabel(alert.assignment.userLevel),
      actorLevel: alert.assignment.userLevel,
      previousValue: ALERT_STATUS_META.TO_PROCESS.label,
      newValue: ALERT_STATUS_META.ASSIGNED.label,
      comment: null,
    });
  }

  /* 3 — Passage en cours d'analyse. */
  if (alert.status === 'IN_PROGRESS' && alert.assignment) {
    push({
      timestamp: minutesBefore(alert.assignment.assignedAt, -18),
      action: 'STATUS_CHANGED',
      actorId: alert.assignment.userId,
      actorName: alert.assignment.userName,
      actorRole: roleLabel(alert.assignment.userLevel),
      actorLevel: alert.assignment.userLevel,
      previousValue: ALERT_STATUS_META.ASSIGNED.label,
      newValue: ALERT_STATUS_META.IN_PROGRESS.label,
      comment: null,
    });
  }

  /* 4 — Escalade vers le niveau 2. */
  if (alert.status === 'ESCALATED') {
    const escalatedAt = alert.assignment?.assignedAt ?? alert.lastActionAt;
    push({
      timestamp: escalatedAt,
      action: 'ESCALATED',
      actorId: 'u-marc',
      actorName: 'Marc Dupont',
      actorRole: roleLabel('LEVEL_1'),
      actorLevel: 'LEVEL_1',
      previousValue: 'Niveau 1',
      newValue: 'Niveau 2',
      comment:
        "Les éléments d'identification concordent sur les critères discriminants. Analyse de niveau 2 requise avant toute décision.",
    });
  }

  /* 5 — Décision de clôture. */
  if (alert.resolution) {
    const meta = DECISION_META[alert.resolution.decision];
    push({
      timestamp: alert.resolution.decidedAt,
      action: 'DECISION_TAKEN',
      actorId: alert.resolution.decidedById,
      actorName: alert.resolution.decidedByName,
      actorRole: roleLabel(alert.resolution.decidedByLevel),
      actorLevel: alert.resolution.decidedByLevel,
      previousValue: ALERT_STATUS_META.IN_PROGRESS.label,
      newValue: `${ALERT_STATUS_META.PROCESSED.label} — ${meta.label}`,
      comment: alert.resolution.comment,
    });
  }

  /* 6 — Réouverture, postérieure à tout le reste. */
  if (alert.reopenCount > 0) {
    push({
      timestamp: minutesBefore(alert.lastActionAt, 4),
      action: 'PROFILE_REFRESHED',
      actorId: null,
      actorName: 'Moteur de screening',
      actorRole: roleLabel('SYSTEM'),
      actorLevel: 'SYSTEM',
      previousValue: 'Aucune inscription active',
      newValue: 'Inscription — liste nationale de gel des avoirs',
      comment: "Mise à jour de la fiche fournisseur détectée lors du rafraîchissement quotidien.",
      sourceIp: '10.0.0.1',
    });

    push({
      timestamp: alert.lastActionAt,
      action: 'ALERT_REOPENED',
      actorId: 'u-amelie',
      actorName: 'Amélie Rousseau',
      actorRole: roleLabel('ADMIN'),
      actorLevel: 'ADMIN',
      previousValue: ALERT_STATUS_META.PROCESSED.label,
      newValue: ALERT_STATUS_META.REOPENED.label,
      comment:
        "Élément nouveau : inscription du client sur la liste nationale de gel des avoirs postérieurement à la clôture. Réouverture pour réexamen immédiat.",
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/* -----------------------------------------------------------------------------
   Fils de commentaires
   -------------------------------------------------------------------------- */

/** Commentaires écrits à la main pour les alertes de démonstration. */
const CURATED_COMMENTS: Record<string, readonly Omit<AlertComment, 'id' | 'alertId'>[]> = {
  'alr-82931': [
    {
      authorId: 'u-marc',
      authorName: 'Marc Dupont',
      authorRole: 'Analyste niveau 1',
      authorLevel: 'LEVEL_1',
      authorHue: 168,
      createdAt: '',
      body: "Le client est entré en relation en 2016, bien avant l'inscription de 2023. Les flux constatés vers les Émirats depuis 2023 méritent d'être regardés de près avant toute conclusion sur l'homonymie.",
    },
  ],
  'alr-82887': [
    {
      authorId: 'u-marc',
      authorName: 'Marc Dupont',
      authorRole: 'Analyste niveau 1',
      authorLevel: 'LEVEL_1',
      authorHue: 168,
      createdAt: '',
      body: "Correspondance parfaite sur les sept critères, adresse comprise. Il ne s'agit pas d'une homonymie : je transmets au niveau 2.",
    },
    {
      authorId: 'u-sophie',
      authorName: 'Sophie Martin',
      authorRole: 'Analyste niveau 2',
      authorLevel: 'LEVEL_2',
      authorHue: 232,
      createdAt: '',
      body: "Confirmé. Le statut PEP court jusqu'à la fin de la période de vigilance résiduelle, en décembre prochain. Je demande la mise à jour du questionnaire d'origine des fonds avant de statuer.",
    },
    {
      authorId: 'u-nadia',
      authorName: 'Nadia Belkacem',
      authorRole: 'Analyste niveau 2',
      authorLevel: 'LEVEL_2',
      authorHue: 288,
      createdAt: '',
      body: "Pour mémoire, une alerte similaire avait été neutralisée en 2024 sur ce même client (A-71204). Le dossier de l'époque contient déjà une déclaration de patrimoine.",
    },
  ],
  'alr-82854': [
    {
      authorId: 'u-sophie',
      authorName: 'Sophie Martin',
      authorRole: 'Analyste niveau 2',
      authorLevel: 'LEVEL_2',
      authorHue: 232,
      createdAt: '',
      body: "Nom et date de naissance concordent, mais la fiche rattache la personne à Dubaï alors que notre client réside à Bordeaux. À confirmer avec le chargé de relation.",
    },
    {
      authorId: 'u-thomas',
      authorName: 'Thomas Leroy',
      authorRole: 'Analyste niveau 1',
      authorLevel: 'LEVEL_1',
      authorHue: 22,
      createdAt: '',
      body: "Le chargé de relation confirme un déménagement depuis Dubaï en 2021. L'écart d'adresse s'explique donc ; la piste RCA reste ouverte.",
    },
  ],
  'alr-82790': [
    {
      authorId: 'u-marc',
      authorName: 'Marc Dupont',
      authorRole: 'Analyste niveau 1',
      authorLevel: 'LEVEL_1',
      authorHue: 168,
      createdAt: '',
      body: "Score faible, tiré uniquement par une proximité phonétique sur le nom et le prénom. Deux ans d'écart sur la date de naissance et nationalités différentes.",
    },
    {
      authorId: 'u-marc',
      authorName: 'Marc Dupont',
      authorRole: 'Analyste niveau 1',
      authorLevel: 'LEVEL_1',
      authorHue: 168,
      createdAt: '',
      body: "Copie de la CNI récupérée au dossier : née à Nantes, nationalité française. Je clôture en homonymie dès validation du contrôle croisé.",
    },
  ],
  'alr-82430': [
    {
      authorId: 'u-nadia',
      authorName: 'Nadia Belkacem',
      authorRole: 'Analyste niveau 2',
      authorLevel: 'LEVEL_2',
      authorHue: 288,
      createdAt: '',
      body: "Réouverture prise en compte. L'inscription au gel national date de trois jours ; elle est postérieure à notre neutralisation.",
    },
    {
      authorId: 'u-amelie',
      authorName: 'Amélie Rousseau',
      authorRole: 'Administrateur conformité',
      authorLevel: 'ADMIN',
      authorHue: 8,
      createdAt: '',
      body: "Priorité maximale. Les mouvements sur le compte doivent être suspendus dans l'attente de la décision.",
    },
  ],
};

const GENERIC_COMMENTS = [
  "Fiche fournisseur consultée. Les éléments publiés ne permettent pas de trancher en l'état.",
  "Pièce d'identité demandée au chargé de relation pour lever le doute sur la date de naissance.",
  'Aucun flux atypique constaté sur les douze derniers mois.',
  'Le lieu de naissance diverge nettement, ce qui affaiblit sensiblement le rapprochement.',
  'Rapprochement déjà écarté sur une alerte antérieure portant sur le même client.',
  "Dossier complété : justificatif de domicile et déclaration d'origine des fonds au dossier.",
  "Le client a été contacté par le réseau ; réponse attendue sous quarante-huit heures.",
];

const GENERIC_AUTHORS: readonly { id: string; name: string; level: UserLevel; hue: number }[] = [
  { id: 'u-marc', name: 'Marc Dupont', level: 'LEVEL_1', hue: 168 },
  { id: 'u-sophie', name: 'Sophie Martin', level: 'LEVEL_2', hue: 232 },
  { id: 'u-thomas', name: 'Thomas Leroy', level: 'LEVEL_1', hue: 22 },
  { id: 'u-nadia', name: 'Nadia Belkacem', level: 'LEVEL_2', hue: 288 },
  { id: 'u-hugo', name: 'Hugo Fontaine', level: 'LEVEL_1', hue: 200 },
];

function buildComments(alert: Alert): AlertComment[] {
  const curated = CURATED_COMMENTS[alert.id];
  const spanMs = Math.max(
    3_600_000,
    new Date(alert.lastActionAt).getTime() - new Date(alert.generatedAt).getTime(),
  );

  if (curated) {
    return curated.map((comment, index) => ({
      ...comment,
      id: `CMT-${alert.id}-${index}`,
      alertId: alert.id,
      createdAt: new Date(
        new Date(alert.generatedAt).getTime() + (spanMs * (index + 1)) / (curated.length + 1),
      ).toISOString(),
    }));
  }

  const count = Math.min(alert.commentCount, GENERIC_COMMENTS.length);
  return Array.from({ length: count }, (_, index) => {
    const seed = (alert.id.charCodeAt(alert.id.length - 1) + index * 7) % GENERIC_AUTHORS.length;
    const author = GENERIC_AUTHORS[seed]!;
    return {
      id: `CMT-${alert.id}-${index}`,
      alertId: alert.id,
      authorId: author.id,
      authorName: author.name,
      authorRole: roleLabel(author.level),
      authorLevel: author.level,
      authorHue: author.hue,
      createdAt: new Date(
        new Date(alert.generatedAt).getTime() + (spanMs * (index + 1)) / (count + 1),
      ).toISOString(),
      body: GENERIC_COMMENTS[(seed + index) % GENERIC_COMMENTS.length]!,
    };
  });
}

/* -----------------------------------------------------------------------------
   Index exposés au reste de l'application
   -------------------------------------------------------------------------- */

export const AUDIT_BY_ALERT: ReadonlyMap<string, readonly AuditEvent[]> = new Map(
  ALERTS.map((alert) => [alert.id, buildAuditTrail(alert)] as const),
);

export const COMMENTS_BY_ALERT: ReadonlyMap<string, readonly AlertComment[]> = new Map(
  ALERTS.map((alert) => [alert.id, buildComments(alert)] as const),
);

/** Dernières entrées d'audit tous dossiers confondus, pour le fil d'activité. */
export const RECENT_ACTIVITY: readonly AuditEvent[] = [...AUDIT_BY_ALERT.values()]
  .flat()
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  .slice(0, 40);
