/**
 * Référentiel des filiales et des utilisateurs.
 *
 * Ces données simulent ce que renverrait le référentiel groupe. Elles sont
 * volontairement cohérentes entre elles : chaque analyste est rattaché à une
 * filiale existante, et les alertes générées respectent ce rattachement.
 */

import type { Subsidiary, User } from '../models';

export const SUBSIDIARIES: readonly Subsidiary[] = [
  {
    id: 'sub-fr',
    code: 'DLX-FR',
    name: 'Delacroix Banque France',
    country: 'France',
    countryCode: 'FR',
    regulator: 'ACPR',
  },
  {
    id: 'sub-lu',
    code: 'DLX-LU',
    name: 'Delacroix Private Banking Luxembourg',
    country: 'Luxembourg',
    countryCode: 'LU',
    regulator: 'CSSF',
  },
  {
    id: 'sub-be',
    code: 'DLX-BE',
    name: 'Delacroix Belgium',
    country: 'Belgique',
    countryCode: 'BE',
    regulator: 'BNB',
  },
  {
    id: 'sub-ch',
    code: 'DLX-CH',
    name: 'Delacroix Suisse',
    country: 'Suisse',
    countryCode: 'CH',
    regulator: 'FINMA',
  },
  {
    id: 'sub-ma',
    code: 'DLX-MA',
    name: 'Delacroix Maroc',
    country: 'Maroc',
    countryCode: 'MA',
    regulator: 'BAM',
  },
];

export const USERS: readonly User[] = [
  {
    id: 'u-sophie',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@delacroix-bank.com',
    level: 'LEVEL_2',
    subsidiaryId: 'sub-fr',
    jobTitle: 'Analyste conformité senior',
    avatarHue: 232,
    active: true,
  },
  {
    id: 'u-marc',
    firstName: 'Marc',
    lastName: 'Dupont',
    email: 'marc.dupont@delacroix-bank.com',
    level: 'LEVEL_1',
    subsidiaryId: 'sub-fr',
    jobTitle: 'Analyste conformité',
    avatarHue: 168,
    active: true,
  },
  {
    id: 'u-nadia',
    firstName: 'Nadia',
    lastName: 'Belkacem',
    email: 'nadia.belkacem@delacroix-bank.com',
    level: 'LEVEL_2',
    subsidiaryId: 'sub-fr',
    jobTitle: 'Analyste sanctions',
    avatarHue: 288,
    active: true,
  },
  {
    id: 'u-thomas',
    firstName: 'Thomas',
    lastName: 'Leroy',
    email: 'thomas.leroy@delacroix-bank.com',
    level: 'LEVEL_1',
    subsidiaryId: 'sub-fr',
    jobTitle: 'Chargé de conformité',
    avatarHue: 22,
    active: true,
  },
  {
    id: 'u-hugo',
    firstName: 'Hugo',
    lastName: 'Fontaine',
    email: 'hugo.fontaine@delacroix-bank.com',
    level: 'LEVEL_1',
    subsidiaryId: 'sub-fr',
    jobTitle: 'Analyste conformité',
    avatarHue: 200,
    active: true,
  },
  {
    id: 'u-clara',
    firstName: 'Clara',
    lastName: 'Vasseur',
    email: 'clara.vasseur@delacroix-bank.com',
    level: 'LEVEL_2',
    subsidiaryId: 'sub-lu',
    jobTitle: 'Analyste conformité senior',
    avatarHue: 340,
    active: true,
  },
  {
    id: 'u-julien',
    firstName: 'Julien',
    lastName: 'Mercier',
    email: 'julien.mercier@delacroix-bank.com',
    level: 'LEVEL_1',
    subsidiaryId: 'sub-be',
    jobTitle: 'Analyste conformité',
    avatarHue: 130,
    active: true,
  },
  {
    id: 'u-lea',
    firstName: 'Léa',
    lastName: 'Girard',
    email: 'lea.girard@delacroix-bank.com',
    level: 'LEVEL_2',
    subsidiaryId: 'sub-ch',
    jobTitle: 'Analyste conformité',
    avatarHue: 258,
    active: true,
  },
  {
    id: 'u-karim',
    firstName: 'Karim',
    lastName: 'Benali',
    email: 'karim.benali@delacroix-bank.com',
    level: 'LEVEL_1',
    subsidiaryId: 'sub-ma',
    jobTitle: 'Analyste conformité',
    avatarHue: 48,
    active: true,
  },
  {
    id: 'u-amelie',
    firstName: 'Amélie',
    lastName: 'Rousseau',
    email: 'amelie.rousseau@delacroix-bank.com',
    level: 'ADMIN',
    subsidiaryId: 'sub-fr',
    jobTitle: 'Responsable conformité groupe',
    avatarHue: 8,
    active: true,
  },
  {
    id: 'u-olivier',
    firstName: 'Olivier',
    lastName: 'Petit',
    email: 'olivier.petit@delacroix-bank.com',
    level: 'LEVEL_1',
    subsidiaryId: 'sub-fr',
    jobTitle: 'Analyste conformité',
    avatarHue: 96,
    active: false,
    lastSeenAt: '2026-05-02T16:20:00.000Z',
  },
];

/** L'utilisateur connecté par défaut au démarrage de la démonstration. */
export const DEFAULT_USER_ID = 'u-sophie';

export function findUser(id: string): User | undefined {
  return USERS.find((user) => user.id === id);
}

export function findSubsidiary(id: string): Subsidiary | undefined {
  return SUBSIDIARIES.find((subsidiary) => subsidiary.id === id);
}
