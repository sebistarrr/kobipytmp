/**
 * Utilisateurs, rôles, filiales et matrice des droits.
 *
 * Avertissement d'architecture : les permissions exposées ici pilotent
 * uniquement l'affichage. Elles ne constituent pas une couche de sécurité.
 * Toute action reste contrôlée côté backend, qui reste seul juge de
 * l'habilitation réelle de l'utilisateur.
 */

export type UserLevel = 'LEVEL_1' | 'LEVEL_2' | 'ADMIN';

export interface UserLevelMeta {
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly variant: string;
}

export const USER_LEVEL_META: Record<UserLevel, UserLevelMeta> = {
  LEVEL_1: {
    label: 'Analyste niveau 1',
    shortLabel: 'Niveau 1',
    description:
      "Premier filtre. Écarte les homonymes manifestes et escalade les cas nécessitant une analyse approfondie.",
    variant: 'info',
  },
  LEVEL_2: {
    label: 'Analyste niveau 2',
    shortLabel: 'Niveau 2',
    description:
      "Analyste conformité de la filiale. Prononce les décisions de neutralisation et d'avération.",
    variant: 'sanction',
  },
  ADMIN: {
    label: 'Administrateur conformité',
    shortLabel: 'Admin',
    description:
      'Pilote le paramétrage du dispositif, les habilitations et le référentiel des filiales.',
    variant: 'accent',
  },
};

/* -----------------------------------------------------------------------------
   Permissions
   -------------------------------------------------------------------------- */
export type Permission =
  | 'alert:view'
  | 'alert:view-client'
  | 'alert:view-screening-profile'
  | 'alert:view-matching'
  | 'alert:view-audit'
  | 'alert:comment'
  | 'alert:assign'
  | 'alert:assign-others'
  | 'decision:homonym'
  | 'decision:escalate'
  | 'decision:neutralize'
  | 'decision:confirm'
  | 'alert:reopen'
  | 'reporting:view'
  | 'reporting:export'
  | 'admin:users'
  | 'admin:settings';

/** Socle commun à tous les analystes, quel que soit le niveau. */
const ANALYST_BASE: readonly Permission[] = [
  'alert:view',
  'alert:view-client',
  'alert:view-screening-profile',
  'alert:view-matching',
  'alert:view-audit',
  'alert:comment',
  'alert:assign',
  'reporting:view',
];

export const PERMISSIONS_BY_LEVEL: Record<UserLevel, readonly Permission[]> = {
  LEVEL_1: [...ANALYST_BASE, 'decision:homonym', 'decision:escalate'],
  LEVEL_2: [
    ...ANALYST_BASE,
    'alert:assign-others',
    'decision:neutralize',
    'decision:confirm',
    'alert:reopen',
    'reporting:export',
  ],
  ADMIN: [
    ...ANALYST_BASE,
    'alert:assign-others',
    'decision:homonym',
    'decision:escalate',
    'decision:neutralize',
    'decision:confirm',
    'alert:reopen',
    'reporting:export',
    'admin:users',
    'admin:settings',
  ],
};

/** Libellés utilisés dans l'écran d'administration présentant la matrice. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'alert:view': "Consulter une alerte",
  'alert:view-client': 'Consulter les données client',
  'alert:view-screening-profile': 'Consulter la fiche de screening',
  'alert:view-matching': 'Consulter le détail du matching',
  'alert:view-audit': "Consulter l'historique d'audit",
  'alert:comment': 'Commenter une alerte',
  'alert:assign': "S'affecter une alerte",
  'alert:assign-others': 'Affecter à un autre analyste',
  'decision:homonym': 'Clôturer en homonyme',
  'decision:escalate': 'Escalader au niveau 2',
  'decision:neutralize': 'Neutraliser une alerte',
  'decision:confirm': 'Avérer une alerte',
  'alert:reopen': 'Rouvrir une alerte traitée',
  'reporting:view': 'Consulter le reporting',
  'reporting:export': 'Exporter les données',
  'admin:users': 'Gérer les utilisateurs',
  'admin:settings': 'Paramétrer le dispositif',
};

/** Regroupement des permissions par domaine, pour l'affichage de la matrice. */
export const PERMISSION_GROUPS: readonly { label: string; permissions: readonly Permission[] }[] = [
  {
    label: 'Consultation',
    permissions: [
      'alert:view',
      'alert:view-client',
      'alert:view-screening-profile',
      'alert:view-matching',
      'alert:view-audit',
    ],
  },
  { label: 'Collaboration', permissions: ['alert:comment', 'alert:assign', 'alert:assign-others'] },
  {
    label: 'Décision',
    permissions: [
      'decision:homonym',
      'decision:escalate',
      'decision:neutralize',
      'decision:confirm',
      'alert:reopen',
    ],
  },
  { label: 'Reporting', permissions: ['reporting:view', 'reporting:export'] },
  { label: 'Administration', permissions: ['admin:users', 'admin:settings'] },
];

/* -----------------------------------------------------------------------------
   Entités
   -------------------------------------------------------------------------- */
export interface Subsidiary {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly country: string;
  readonly countryCode: string;
  /** Fuseau réglementaire de rattachement, affiché dans le sélecteur. */
  readonly regulator: string;
}

export interface User {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly level: UserLevel;
  readonly subsidiaryId: string;
  readonly jobTitle: string;
  /** Teinte d'avatar dérivée de l'identité, stable dans le temps. */
  readonly avatarHue: number;
  readonly active: boolean;
  readonly lastSeenAt?: string;
}

export function fullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`;
}

export function initials(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}
