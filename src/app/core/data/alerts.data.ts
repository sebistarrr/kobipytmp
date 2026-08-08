/**
 * Jeu de données de démonstration.
 *
 * Deux sources se combinent : une dizaine d'alertes écrites à la main, riches
 * et cohérentes de bout en bout (elles servent de vitrine à l'écran
 * d'investigation), et un générateur déterministe qui produit le volume
 * nécessaire pour éprouver les filtres, le tri et la pagination.
 *
 * Les dates sont exprimées relativement à l'instant de chargement : le jeu de
 * données reste crédible quelle que soit la date d'exécution.
 */

import {
  derivePriority,
  type Alert,
  type AlertStatus,
  type Client,
  type ComparisonResult,
  type MatchAttribute,
  type MatchCriterion,
  type MatchDetail,
  type ProfileAlias,
  type ScreeningProfile,
  type ScreeningType,
} from '../models';

/* -----------------------------------------------------------------------------
   Utilitaires temporels et aléatoire déterministe
   -------------------------------------------------------------------------- */

const NOW = new Date();

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return hoursAgo(days * 24);
}

/** Générateur congruentiel : même graine, même jeu de données à chaque exécution. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const rand = makeRandom(20260808);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/* -----------------------------------------------------------------------------
   Calcul du score : le global est toujours la moyenne pondérée du détail,
   de sorte que l'analyste puisse réconcilier ce qu'il voit.
   -------------------------------------------------------------------------- */

function computeScore(criteria: readonly MatchCriterion[]): number {
  const total = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
  const weights = criteria.reduce((sum, c) => sum + c.weight, 0);
  return Math.round(total / weights);
}

interface CriterionSeed {
  readonly attribute: MatchAttribute;
  readonly score: number;
  readonly weight: number;
  readonly result: ComparisonResult;
  readonly rationale: string;
}

function criteria(seeds: readonly CriterionSeed[]): MatchCriterion[] {
  return seeds.map((seed) => ({ ...seed }));
}

function matchDetail(
  seeds: readonly CriterionSeed[],
  matchedAliasId: string,
  computedAt: string,
): MatchDetail {
  const list = criteria(seeds);
  return {
    score: computeScore(list),
    criteria: list,
    matchedAliasId,
    algorithm: 'Jaro-Winkler pondéré + phonétique Beider-Morse',
    computedAt,
  };
}

/* =============================================================================
   ALERTES ÉCRITES À LA MAIN
   ========================================================================== */

/* --- A-82931 — Jean Dupont / sanctions UE ---------------------------------- */

const clientJeanDupont: Client = {
  id: 'cli-10482',
  reference: 'FR-10482-DUP',
  firstName: 'Jean',
  lastName: 'Dupont',
  birthDate: '1978-04-12',
  birthPlace: 'Paris, France',
  nationality: 'Française',
  nationalityCode: 'FR',
  residenceCountry: 'France',
  address: {
    line1: '14 rue de la Boétie',
    city: 'Paris',
    postalCode: '75008',
    country: 'France',
    countryCode: 'FR',
  },
  relationshipStartDate: '2016-09-03',
  occupation: 'Dirigeant de société',
  employer: 'Meridian Logistics SAS',
  clientSegment: 'Banque privée',
  aliases: ['Jean-Pierre Dupont'],
  subsidiaryId: 'sub-fr',
  annualFlowEur: 4_280_000,
  riskRating: 'ÉLEVÉ',
  identityDocument: 'CNI 060784120394',
};

const profileJeanDupont: ScreeningProfile = {
  id: 'prf-fa-40219',
  providerId: 'FA-40219',
  provider: 'Factiva',
  firstName: 'Jean',
  lastName: 'Dupont',
  birthDate: '1978-04-12',
  birthDateApproximate: false,
  birthPlace: 'Lyon, France',
  nationality: 'Française',
  nationalityCode: 'FR',
  countries: ['France', 'Émirats arabes unis'],
  address: {
    line1: '8 quai Claude Bernard',
    city: 'Lyon',
    postalCode: '69007',
    country: 'France',
    countryCode: 'FR',
  },
  gender: 'Masculin',
  deceased: false,
  aliases: [
    { id: 'al-1', fullName: 'Jean Dupont', kind: 'Nom principal', score: 96 },
    { id: 'al-2', fullName: 'Jean-Pierre Dupont', kind: 'Variante', score: 89 },
    { id: 'al-3', fullName: 'J. Dupont', kind: 'Nom d’usage', score: 84 },
    { id: 'al-4', fullName: 'John Dupont', kind: 'Translittération', script: 'Latin', score: 76 },
  ],
  positions: [
    {
      title: 'Gérant',
      organisation: 'Meridian Shipping FZE',
      country: 'Émirats arabes unis',
      from: '2019-06-01',
      to: null,
    },
    {
      title: 'Administrateur',
      organisation: 'Orion Trading Ltd',
      country: 'Chypre',
      from: '2015-02-01',
      to: '2019-05-31',
    },
  ],
  organisations: ['Meridian Shipping FZE', 'Orion Trading Ltd'],
  isPep: false,
  pepCategory: null,
  sanctions: [
    {
      programme: 'Règlement (UE) 2014/269 — mesures restrictives Ukraine',
      authority: 'Union européenne',
      listedOn: '2023-02-25',
      reference: 'EU.2014.269.1842',
      measures: 'Gel des avoirs — interdiction de mise à disposition de fonds',
      active: true,
    },
    {
      programme: 'Consolidated List',
      authority: 'HM Treasury (Royaume-Uni)',
      listedOn: '2023-03-14',
      reference: 'UK-14522',
      measures: 'Gel des avoirs',
      active: true,
    },
  ],
  relatedParties: [
    { name: 'Elena Dupont', relationship: 'Conjointe', nature: 'Famille' },
    { name: 'Meridian Shipping FZE', relationship: 'Entité contrôlée', nature: 'Entité liée' },
  ],
  sources: [
    { name: 'Journal officiel de l’Union européenne', publishedAt: '2023-02-25', kind: 'Officielle' },
    { name: 'UK Sanctions List', publishedAt: '2023-03-14', kind: 'Officielle' },
    { name: 'Reuters — Shipping sanctions expanded', publishedAt: '2023-03-02', kind: 'Presse' },
  ],
  lastUpdatedAt: daysAgo(11),
  summary:
    "Dirigeant d'une société de transport maritime visée par les mesures restrictives européennes adoptées en 2023. Inscrit au titre du contournement présumé de l'embargo sur les produits pétroliers.",
};

const alertJeanDupont: Alert = {
  id: 'alr-82931',
  reference: 'A-82931',
  type: 'SANCTION',
  status: 'TO_PROCESS',
  priority: 'CRITICAL',
  subsidiaryId: 'sub-fr',
  client: clientJeanDupont,
  profile: profileJeanDupont,
  match: matchDetail(
    [
      {
        attribute: 'lastName',
        score: 100,
        weight: 26,
        result: 'MATCH',
        rationale: 'Correspondance exacte, sensibilité à la casse neutralisée.',
      },
      {
        attribute: 'firstName',
        score: 100,
        weight: 20,
        result: 'MATCH',
        rationale: "Correspondance exacte sur l'alias principal de la fiche.",
      },
      {
        attribute: 'birthDate',
        score: 100,
        weight: 24,
        result: 'MATCH',
        rationale: 'Date de naissance identique au jour près (12/04/1978).',
      },
      {
        attribute: 'nationality',
        score: 100,
        weight: 9,
        result: 'MATCH',
        rationale: 'Nationalité française déclarée des deux côtés.',
      },
      {
        attribute: 'residenceCountry',
        score: 100,
        weight: 5,
        result: 'MATCH',
        rationale: 'France retenue comme pays de résidence principal sur la fiche.',
      },
      {
        attribute: 'address',
        score: 65,
        weight: 10,
        result: 'DIVERGENCE',
        rationale:
          "Villes différentes (Paris / Lyon). Le pays concorde, ce qui maintient une contribution partielle.",
      },
      {
        attribute: 'birthPlace',
        score: 55,
        weight: 6,
        result: 'UNCERTAIN',
        rationale:
          "Le client déclare Paris, la fiche indique Lyon. Aucune pièce d'état civil ne permet de trancher.",
      },
    ],
    'al-1',
    hoursAgo(5.2),
  ),
  generatedAt: hoursAgo(5.2),
  assignment: null,
  resolution: null,
  lastActionLabel: 'Alerte générée',
  lastActionAt: hoursAgo(5.2),
  commentCount: 1,
  reopenCount: 0,
  triggeredBy: 'Screening quotidien — base clients actifs',
  batchId: 'BATCH-2026-0808-A',
};

/* --- A-82887 — Marie Martin / PEP ------------------------------------------ */

const alertMarieMartin: Alert = {
  id: 'alr-82887',
  reference: 'A-82887',
  type: 'PEP',
  status: 'ESCALATED',
  priority: 'CRITICAL',
  subsidiaryId: 'sub-fr',
  client: {
    id: 'cli-20915',
    reference: 'FR-20915-MAR',
    firstName: 'Marie',
    lastName: 'Martin',
    birthDate: '1969-11-23',
    birthPlace: 'Bordeaux, France',
    nationality: 'Française',
    nationalityCode: 'FR',
    residenceCountry: 'France',
    address: {
      line1: '27 avenue Montaigne',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      countryCode: 'FR',
    },
    relationshipStartDate: '2011-04-18',
    occupation: 'Consultante en affaires publiques',
    employer: 'Cabinet Vallois & Associés',
    clientSegment: 'Banque privée',
    aliases: ['Marie Martin-Lefèvre'],
    subsidiaryId: 'sub-fr',
    annualFlowEur: 1_940_000,
    riskRating: 'ÉLEVÉ',
    identityDocument: 'Passeport 18AB94721',
  },
  profile: {
    id: 'prf-fa-51877',
    providerId: 'FA-51877',
    provider: 'Factiva',
    firstName: 'Marie',
    lastName: 'Martin',
    birthDate: '1969-11-23',
    birthDateApproximate: false,
    birthPlace: 'Bordeaux, France',
    nationality: 'Française',
    nationalityCode: 'FR',
    countries: ['France', 'Belgique'],
    address: {
      line1: '27 avenue Montaigne',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      countryCode: 'FR',
    },
    gender: 'Féminin',
    deceased: false,
    aliases: [
      { id: 'al-1', fullName: 'Marie Martin', kind: 'Nom principal', score: 98 },
      { id: 'al-2', fullName: 'Marie Martin-Lefèvre', kind: 'Nom d’usage', score: 93 },
      { id: 'al-3', fullName: 'M. Martin', kind: 'Variante', score: 81 },
    ],
    positions: [
      {
        title: 'Directrice de cabinet adjointe',
        organisation: 'Ministère de l’Économie et des Finances',
        country: 'France',
        from: '2017-05-01',
        to: '2020-07-31',
      },
      {
        title: 'Conseillère spéciale',
        organisation: 'Commission européenne — DG TRADE',
        country: 'Belgique',
        from: '2020-09-01',
        to: '2023-12-31',
      },
    ],
    organisations: ['Ministère de l’Économie et des Finances', 'Commission européenne'],
    isPep: true,
    pepCategory: 'PEP nationale — ancienne haute fonction publique',
    sanctions: [],
    relatedParties: [
      { name: 'Antoine Martin', relationship: 'Conjoint', nature: 'Famille' },
      { name: 'Cabinet Vallois & Associés', relationship: 'Employeur actuel', nature: 'Entité liée' },
    ],
    sources: [
      { name: 'Journal officiel de la République française', publishedAt: '2017-05-04', kind: 'Officielle' },
      { name: 'Registre de transparence de l’UE', publishedAt: '2024-01-15', kind: 'Registre' },
      { name: 'Les Échos — Nominations', publishedAt: '2020-09-02', kind: 'Presse' },
    ],
    lastUpdatedAt: daysAgo(4),
    summary:
      "Ancienne directrice de cabinet adjointe au ministère de l'Économie, puis conseillère à la Commission européenne. Statut de PEP maintenu pendant la période de vigilance résiduelle de douze mois.",
  },
  match: matchDetail(
    [
      { attribute: 'lastName', score: 100, weight: 26, result: 'MATCH', rationale: 'Correspondance exacte.' },
      { attribute: 'firstName', score: 100, weight: 20, result: 'MATCH', rationale: 'Correspondance exacte.' },
      {
        attribute: 'birthDate',
        score: 100,
        weight: 24,
        result: 'MATCH',
        rationale: 'Date de naissance identique (23/11/1969).',
      },
      { attribute: 'nationality', score: 100, weight: 9, result: 'MATCH', rationale: 'Nationalité française.' },
      {
        attribute: 'residenceCountry',
        score: 100,
        weight: 5,
        result: 'MATCH',
        rationale: 'France dans les deux référentiels.',
      },
      {
        attribute: 'address',
        score: 80,
        weight: 10,
        result: 'MATCH',
        rationale:
          "Même voie et même code postal ; seul le complément d'adresse (bâtiment) diffère.",
      },
      {
        attribute: 'birthPlace',
        score: 100,
        weight: 6,
        result: 'MATCH',
        rationale: 'Bordeaux confirmé par les deux sources.',
      },
    ],
    'al-1',
    hoursAgo(31),
  ),
  generatedAt: hoursAgo(31),
  assignment: {
    userId: 'u-sophie',
    userName: 'Sophie Martin',
    userLevel: 'LEVEL_2',
    userHue: 232,
    assignedAt: hoursAgo(6),
    assignedByName: 'Marc Dupont',
  },
  resolution: null,
  lastActionLabel: 'Escalade niveau 2',
  lastActionAt: hoursAgo(6),
  commentCount: 3,
  reopenCount: 0,
  triggeredBy: 'Screening quotidien — base clients actifs',
  batchId: 'BATCH-2026-0807-B',
};

/* --- A-82854 — John Smith / RCA -------------------------------------------- */

const alertJohnSmith: Alert = {
  id: 'alr-82854',
  reference: 'A-82854',
  type: 'RCA',
  status: 'ASSIGNED',
  priority: 'HIGH',
  subsidiaryId: 'sub-fr',
  client: {
    id: 'cli-31204',
    reference: 'FR-31204-SMI',
    firstName: 'John',
    lastName: 'Smith',
    birthDate: '1985-07-02',
    birthPlace: 'Manchester, Royaume-Uni',
    nationality: 'Britannique',
    nationalityCode: 'GB',
    residenceCountry: 'France',
    address: {
      line1: '5 rue Sainte-Catherine',
      city: 'Bordeaux',
      postalCode: '33000',
      country: 'France',
      countryCode: 'FR',
    },
    relationshipStartDate: '2021-01-25',
    occupation: 'Consultant indépendant',
    employer: 'Smith Advisory Ltd',
    clientSegment: 'Clientèle patrimoniale',
    aliases: [],
    subsidiaryId: 'sub-fr',
    annualFlowEur: 620_000,
    riskRating: 'MODÉRÉ',
    identityDocument: 'Passeport GB 549218733',
  },
  profile: {
    id: 'prf-fa-60733',
    providerId: 'FA-60733',
    provider: 'Factiva',
    firstName: 'Jonathan',
    lastName: 'Smith',
    birthDate: '1985-07-02',
    birthDateApproximate: false,
    birthPlace: null,
    nationality: 'Britannique',
    nationalityCode: 'GB',
    countries: ['Royaume-Uni', 'Émirats arabes unis'],
    address: {
      line1: 'Sheikh Zayed Road',
      city: 'Dubaï',
      country: 'Émirats arabes unis',
      countryCode: 'AE',
    },
    gender: 'Masculin',
    deceased: false,
    aliases: [
      { id: 'al-1', fullName: 'Jonathan Smith', kind: 'Nom principal', score: 82 },
      { id: 'al-2', fullName: 'John Smith', kind: 'Nom d’usage', score: 94 },
      { id: 'al-3', fullName: 'J. R. Smith', kind: 'Variante', score: 72 },
    ],
    positions: [
      {
        title: 'Directeur associé',
        organisation: 'Northgate Capital Partners',
        country: 'Émirats arabes unis',
        from: '2020-03-01',
        to: null,
      },
    ],
    organisations: ['Northgate Capital Partners'],
    isPep: false,
    pepCategory: null,
    sanctions: [],
    relatedParties: [
      {
        name: 'Robert Smith',
        relationship: 'Père — ancien ministre des Transports (Royaume-Uni)',
        nature: 'Famille',
      },
      { name: 'Northgate Capital Partners', relationship: 'Société détenue à 40 %', nature: 'Entité liée' },
    ],
    sources: [
      { name: 'Companies House — Registre britannique', publishedAt: '2024-06-11', kind: 'Registre' },
      { name: 'Financial Times — Gulf investment vehicles', publishedAt: '2025-02-19', kind: 'Presse' },
    ],
    lastUpdatedAt: daysAgo(19),
    summary:
      "Identifié comme proche d'une personne politiquement exposée : fils d'un ancien ministre britannique des Transports. Aucune inscription directe sur une liste de sanctions.",
  },
  match: matchDetail(
    [
      { attribute: 'lastName', score: 100, weight: 26, result: 'MATCH', rationale: 'Correspondance exacte.' },
      {
        attribute: 'firstName',
        score: 100,
        weight: 20,
        result: 'MATCH',
        rationale:
          "« John » figure comme nom d'usage sur la fiche : correspondance exacte avec l'alias retenu.",
      },
      {
        attribute: 'birthDate',
        score: 100,
        weight: 24,
        result: 'MATCH',
        rationale: 'Date de naissance identique (02/07/1985).',
      },
      { attribute: 'nationality', score: 100, weight: 9, result: 'MATCH', rationale: 'Nationalité britannique.' },
      {
        attribute: 'residenceCountry',
        score: 0,
        weight: 5,
        result: 'DIVERGENCE',
        rationale: 'Client résident en France, fiche rattachée aux Émirats arabes unis.',
      },
      {
        attribute: 'address',
        score: 30,
        weight: 10,
        result: 'PARTIAL',
        rationale:
          "Bordeaux contre Dubaï. Le dossier fait état d'un déménagement depuis les Émirats en 2021, ce qui rend l'écart explicable.",
      },
      {
        attribute: 'birthPlace',
        score: 0,
        weight: 6,
        result: 'MISSING',
        rationale: 'Lieu de naissance absent de la fiche fournisseur.',
      },
    ],
    'al-2',
    hoursAgo(52),
  ),
  generatedAt: hoursAgo(52),
  assignment: {
    userId: 'u-sophie',
    userName: 'Sophie Martin',
    userLevel: 'LEVEL_2',
    userHue: 232,
    assignedAt: hoursAgo(20),
    assignedByName: 'Sophie Martin',
  },
  resolution: null,
  lastActionLabel: 'Alerte affectée',
  lastActionAt: hoursAgo(20),
  commentCount: 2,
  reopenCount: 0,
  triggeredBy: 'Screening hebdomadaire — bénéficiaires effectifs',
  batchId: 'BATCH-2026-0806-C',
};

/* --- A-82790 — Sophie Bernard / sanction, score modéré --------------------- */

const alertSophieBernard: Alert = {
  id: 'alr-82790',
  reference: 'A-82790',
  type: 'SANCTION',
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  subsidiaryId: 'sub-fr',
  client: {
    id: 'cli-40817',
    reference: 'FR-40817-BER',
    firstName: 'Sophie',
    lastName: 'Bernard',
    birthDate: '1991-02-17',
    birthPlace: 'Nantes, France',
    nationality: 'Française',
    nationalityCode: 'FR',
    residenceCountry: 'France',
    address: {
      line1: '12 rue Crébillon',
      city: 'Nantes',
      postalCode: '44000',
      country: 'France',
      countryCode: 'FR',
    },
    relationshipStartDate: '2019-06-11',
    occupation: 'Architecte',
    employer: 'Atelier Bernard',
    clientSegment: 'Clientèle particuliers',
    aliases: [],
    subsidiaryId: 'sub-fr',
    annualFlowEur: 148_000,
    riskRating: 'FAIBLE',
    identityDocument: 'CNI 910217441028',
  },
  profile: {
    id: 'prf-fa-70155',
    providerId: 'FA-70155',
    provider: 'Factiva',
    firstName: 'Sofia',
    lastName: 'Bernardi',
    birthDate: '1989-06-30',
    birthDateApproximate: true,
    birthPlace: 'Milan, Italie',
    nationality: 'Italienne',
    nationalityCode: 'IT',
    countries: ['Italie', 'Syrie'],
    address: { line1: 'Via Torino 44', city: 'Milan', country: 'Italie', countryCode: 'IT' },
    gender: 'Féminin',
    deceased: false,
    aliases: [
      { id: 'al-1', fullName: 'Sofia Bernardi', kind: 'Nom principal', score: 67 },
      { id: 'al-2', fullName: 'Sophia Bernardi', kind: 'Translittération', script: 'Latin', score: 71 },
      { id: 'al-3', fullName: 'S. Bernardi', kind: 'Variante', score: 58 },
    ],
    positions: [
      {
        title: 'Directrice commerciale',
        organisation: 'Levant Trade SRL',
        country: 'Italie',
        from: '2018-01-01',
        to: null,
      },
    ],
    organisations: ['Levant Trade SRL'],
    isPep: false,
    pepCategory: null,
    sanctions: [
      {
        programme: 'Règlement (UE) 36/2012 — mesures restrictives Syrie',
        authority: 'Union européenne',
        listedOn: '2021-10-18',
        reference: 'EU.2012.036.0774',
        measures: 'Gel des avoirs — interdiction de voyage',
        active: true,
      },
    ],
    relatedParties: [{ name: 'Levant Trade SRL', relationship: 'Dirigeante', nature: 'Entité liée' }],
    sources: [
      { name: 'Journal officiel de l’Union européenne', publishedAt: '2021-10-18', kind: 'Officielle' },
    ],
    lastUpdatedAt: daysAgo(63),
    summary:
      "Dirigeante d'une société de négoce inscrite au titre du régime de sanctions visant la Syrie. Profil très éloigné du client sur les critères d'identité.",
  },
  match: matchDetail(
    [
      {
        attribute: 'lastName',
        score: 74,
        weight: 26,
        result: 'PARTIAL',
        rationale: 'Racine commune « Bernard » ; le suffixe « -i » abaisse la similarité phonétique.',
      },
      {
        attribute: 'firstName',
        score: 79,
        weight: 20,
        result: 'PARTIAL',
        rationale: '« Sophie » et « Sofia » partagent la même racine phonétique.',
      },
      {
        attribute: 'birthDate',
        score: 0,
        weight: 24,
        result: 'DIVERGENCE',
        rationale: 'Écart de plus de deux ans (17/02/1991 contre 30/06/1989, date approximative).',
      },
      {
        attribute: 'nationality',
        score: 0,
        weight: 9,
        result: 'DIVERGENCE',
        rationale: 'Nationalité française contre italienne.',
      },
      {
        attribute: 'residenceCountry',
        score: 0,
        weight: 5,
        result: 'DIVERGENCE',
        rationale: 'France contre Italie.',
      },
      {
        attribute: 'address',
        score: 0,
        weight: 10,
        result: 'DIVERGENCE',
        rationale: 'Nantes contre Milan, aucun élément commun.',
      },
      {
        attribute: 'birthPlace',
        score: 0,
        weight: 6,
        result: 'DIVERGENCE',
        rationale: 'Nantes contre Milan.',
      },
    ],
    'al-2',
    hoursAgo(76),
  ),
  generatedAt: hoursAgo(76),
  assignment: {
    userId: 'u-marc',
    userName: 'Marc Dupont',
    userLevel: 'LEVEL_1',
    userHue: 168,
    assignedAt: hoursAgo(30),
    assignedByName: 'Marc Dupont',
  },
  resolution: null,
  lastActionLabel: 'Commentaire ajouté',
  lastActionAt: hoursAgo(9),
  commentCount: 2,
  reopenCount: 0,
  triggeredBy: 'Screening quotidien — base clients actifs',
  batchId: 'BATCH-2026-0805-A',
};

/* --- A-82733 — Pierre Laurent / PEP, score faible -------------------------- */

const alertPierreLaurent: Alert = {
  id: 'alr-82733',
  reference: 'A-82733',
  type: 'PEP',
  status: 'TO_PROCESS',
  priority: 'LOW',
  subsidiaryId: 'sub-fr',
  client: {
    id: 'cli-50293',
    reference: 'FR-50293-LAU',
    firstName: 'Pierre',
    lastName: 'Laurent',
    birthDate: '1974-09-08',
    birthPlace: 'Lille, France',
    nationality: 'Française',
    nationalityCode: 'FR',
    residenceCountry: 'France',
    address: {
      line1: '3 place du Général de Gaulle',
      city: 'Lille',
      postalCode: '59000',
      country: 'France',
      countryCode: 'FR',
    },
    relationshipStartDate: '2008-03-20',
    occupation: 'Pharmacien',
    employer: 'Pharmacie du Centre',
    clientSegment: 'Professionnels',
    aliases: [],
    subsidiaryId: 'sub-fr',
    annualFlowEur: 890_000,
    riskRating: 'FAIBLE',
    identityDocument: 'CNI 740908590112',
  },
  profile: {
    id: 'prf-fa-81022',
    providerId: 'FA-81022',
    provider: 'Factiva',
    firstName: 'Pierre-Emmanuel',
    lastName: 'Laurent-Dubreuil',
    birthDate: '1962-01-30',
    birthDateApproximate: false,
    birthPlace: 'Dakar, Sénégal',
    nationality: 'Sénégalaise',
    nationalityCode: 'SN',
    countries: ['Sénégal', 'France'],
    address: { line1: 'Avenue Léopold Sédar Senghor', city: 'Dakar', country: 'Sénégal', countryCode: 'SN' },
    gender: 'Masculin',
    deceased: false,
    aliases: [
      { id: 'al-1', fullName: 'Pierre-Emmanuel Laurent-Dubreuil', kind: 'Nom principal', score: 42 },
      { id: 'al-2', fullName: 'P. E. Laurent', kind: 'Variante', score: 55 },
    ],
    positions: [
      {
        title: 'Secrétaire général adjoint',
        organisation: 'Ministère de la Santé',
        country: 'Sénégal',
        from: '2014-02-01',
        to: '2019-11-30',
      },
    ],
    organisations: ['Ministère de la Santé du Sénégal'],
    isPep: true,
    pepCategory: 'PEP étrangère — haute fonction publique',
    sanctions: [],
    relatedParties: [],
    sources: [{ name: 'Journal officiel du Sénégal', publishedAt: '2014-02-11', kind: 'Officielle' }],
    lastUpdatedAt: daysAgo(120),
    summary:
      "Ancien secrétaire général adjoint du ministère de la Santé du Sénégal. Le rapprochement repose uniquement sur une racine patronymique commune.",
  },
  match: matchDetail(
    [
      {
        attribute: 'lastName',
        score: 79,
        weight: 26,
        result: 'PARTIAL',
        rationale: '« Laurent » est le premier composant d’un patronyme double sur la fiche.',
      },
      {
        attribute: 'firstName',
        score: 80,
        weight: 20,
        result: 'PARTIAL',
        rationale: '« Pierre » est le premier composant de « Pierre-Emmanuel ».',
      },
      {
        attribute: 'birthDate',
        score: 0,
        weight: 24,
        result: 'DIVERGENCE',
        rationale: 'Douze ans d’écart (08/09/1974 contre 30/01/1962).',
      },
      {
        attribute: 'nationality',
        score: 0,
        weight: 9,
        result: 'DIVERGENCE',
        rationale: 'Française contre sénégalaise.',
      },
      {
        attribute: 'residenceCountry',
        score: 100,
        weight: 5,
        result: 'MATCH',
        rationale: 'La France figure parmi les pays de rattachement de la fiche.',
      },
      {
        attribute: 'address',
        score: 0,
        weight: 10,
        result: 'DIVERGENCE',
        rationale: 'Lille contre Dakar.',
      },
      {
        attribute: 'birthPlace',
        score: 0,
        weight: 6,
        result: 'DIVERGENCE',
        rationale: 'Lille contre Dakar.',
      },
    ],
    'al-2',
    hoursAgo(96),
  ),
  generatedAt: hoursAgo(96),
  assignment: null,
  resolution: null,
  lastActionLabel: 'Alerte générée',
  lastActionAt: hoursAgo(96),
  commentCount: 0,
  reopenCount: 0,
  triggeredBy: 'Screening mensuel — revue de portefeuille',
  batchId: 'BATCH-2026-0804-D',
};

/* --- A-82612 — alerte avérée ----------------------------------------------- */

const alertViktor: Alert = {
  id: 'alr-82612',
  reference: 'A-82612',
  type: 'SANCTION',
  status: 'PROCESSED',
  priority: 'CRITICAL',
  subsidiaryId: 'sub-fr',
  client: {
    id: 'cli-60441',
    reference: 'FR-60441-ALE',
    firstName: 'Viktor',
    lastName: 'Aleksandrov',
    birthDate: '1971-03-19',
    birthPlace: 'Minsk, Biélorussie',
    nationality: 'Biélorusse',
    nationalityCode: 'BY',
    residenceCountry: 'France',
    address: {
      line1: '18 boulevard de la Croisette',
      city: 'Cannes',
      postalCode: '06400',
      country: 'France',
      countryCode: 'FR',
    },
    relationshipStartDate: '2014-11-07',
    occupation: 'Investisseur',
    employer: 'Volna Holdings',
    clientSegment: 'Banque privée',
    aliases: ['Viktor Alexandrov'],
    subsidiaryId: 'sub-fr',
    annualFlowEur: 12_600_000,
    riskRating: 'ÉLEVÉ',
    identityDocument: 'Passeport BY MP2841097',
  },
  profile: {
    id: 'prf-fa-33019',
    providerId: 'FA-33019',
    provider: 'Factiva',
    firstName: 'Viktor',
    lastName: 'Aleksandrov',
    birthDate: '1971-03-19',
    birthDateApproximate: false,
    birthPlace: 'Minsk, Biélorussie',
    nationality: 'Biélorusse',
    nationalityCode: 'BY',
    countries: ['Biélorussie', 'France', 'Chypre'],
    address: {
      line1: '18 boulevard de la Croisette',
      city: 'Cannes',
      postalCode: '06400',
      country: 'France',
      countryCode: 'FR',
    },
    gender: 'Masculin',
    deceased: false,
    aliases: [
      { id: 'al-1', fullName: 'Viktor Aleksandrov', kind: 'Nom principal', score: 100 },
      { id: 'al-2', fullName: 'Виктор Александров', kind: 'Translittération', script: 'Cyrillique', score: 97 },
      { id: 'al-3', fullName: 'Viktor Alexandrov', kind: 'Variante', score: 96 },
    ],
    positions: [
      {
        title: 'Actionnaire de référence',
        organisation: 'Volna Holdings',
        country: 'Chypre',
        from: '2012-05-01',
        to: null,
      },
    ],
    organisations: ['Volna Holdings', 'Belneftekhim'],
    isPep: false,
    pepCategory: null,
    sanctions: [
      {
        programme: 'Règlement (UE) 765/2006 — mesures restrictives Biélorussie',
        authority: 'Union européenne',
        listedOn: '2022-06-03',
        reference: 'EU.2006.765.0219',
        measures: 'Gel des avoirs — interdiction de voyage',
        active: true,
      },
      {
        programme: 'Specially Designated Nationals List',
        authority: 'OFAC (États-Unis)',
        listedOn: '2022-08-09',
        reference: 'OFAC-SDN-41207',
        measures: 'Blocage total des avoirs',
        active: true,
      },
    ],
    relatedParties: [
      { name: 'Volna Holdings', relationship: 'Actionnaire majoritaire', nature: 'Entité liée' },
    ],
    sources: [
      { name: 'Journal officiel de l’Union européenne', publishedAt: '2022-06-03', kind: 'Officielle' },
      { name: 'OFAC — SDN List', publishedAt: '2022-08-09', kind: 'Officielle' },
    ],
    lastUpdatedAt: daysAgo(30),
    summary:
      "Actionnaire de référence d'un conglomérat biélorusse, visé par les mesures restrictives européennes et américaines depuis 2022.",
  },
  match: matchDetail(
    [
      { attribute: 'lastName', score: 100, weight: 26, result: 'MATCH', rationale: 'Correspondance exacte.' },
      { attribute: 'firstName', score: 100, weight: 20, result: 'MATCH', rationale: 'Correspondance exacte.' },
      { attribute: 'birthDate', score: 100, weight: 24, result: 'MATCH', rationale: 'Date identique.' },
      { attribute: 'nationality', score: 100, weight: 9, result: 'MATCH', rationale: 'Nationalité biélorusse.' },
      { attribute: 'residenceCountry', score: 100, weight: 5, result: 'MATCH', rationale: 'France.' },
      { attribute: 'address', score: 100, weight: 10, result: 'MATCH', rationale: 'Adresse strictement identique.' },
      { attribute: 'birthPlace', score: 100, weight: 6, result: 'MATCH', rationale: 'Minsk confirmé.' },
    ],
    'al-1',
    daysAgo(12),
  ),
  generatedAt: daysAgo(12),
  assignment: {
    userId: 'u-nadia',
    userName: 'Nadia Belkacem',
    userLevel: 'LEVEL_2',
    userHue: 288,
    assignedAt: daysAgo(12),
    assignedByName: 'Marc Dupont',
  },
  resolution: {
    decision: 'CONFIRMED',
    decidedById: 'u-nadia',
    decidedByName: 'Nadia Belkacem',
    decidedByLevel: 'LEVEL_2',
    decidedAt: daysAgo(11.4),
    comment:
      "Identité confirmée sur l'ensemble des critères, y compris l'adresse et le lieu de naissance. Inscription active sur les listes UE et OFAC. Gel des avoirs mis en œuvre et déclaration de soupçon transmise à Tracfin le jour même.",
    level: 2,
  },
  lastActionLabel: 'Décision : avérée',
  lastActionAt: daysAgo(11.4),
  commentCount: 4,
  reopenCount: 0,
  triggeredBy: 'Screening quotidien — base clients actifs',
  batchId: 'BATCH-2026-0727-A',
};

/* --- A-82588 — clôturée en homonyme par le niveau 1 ------------------------ */

const alertHomonym: Alert = {
  id: 'alr-82588',
  reference: 'A-82588',
  type: 'PEP',
  status: 'PROCESSED',
  priority: 'MEDIUM',
  subsidiaryId: 'sub-fr',
  client: {
    id: 'cli-70118',
    reference: 'FR-70118-GAR',
    firstName: 'Lucas',
    lastName: 'Garnier',
    birthDate: '1996-12-04',
    birthPlace: 'Rennes, France',
    nationality: 'Française',
    nationalityCode: 'FR',
    residenceCountry: 'France',
    address: {
      line1: '9 rue de Nemours',
      city: 'Rennes',
      postalCode: '35000',
      country: 'France',
      countryCode: 'FR',
    },
    relationshipStartDate: '2022-09-15',
    occupation: 'Développeur logiciel',
    employer: 'Kaelys SAS',
    clientSegment: 'Clientèle particuliers',
    aliases: [],
    subsidiaryId: 'sub-fr',
    annualFlowEur: 52_000,
    riskRating: 'FAIBLE',
    identityDocument: 'CNI 961204350776',
  },
  profile: {
    id: 'prf-fa-90244',
    providerId: 'FA-90244',
    provider: 'Factiva',
    firstName: 'Lucas',
    lastName: 'Garnier',
    birthDate: '1958-08-21',
    birthDateApproximate: false,
    birthPlace: 'Abidjan, Côte d’Ivoire',
    nationality: 'Ivoirienne',
    nationalityCode: 'CI',
    countries: ['Côte d’Ivoire'],
    address: { line1: 'Boulevard Lagunaire', city: 'Abidjan', country: 'Côte d’Ivoire', countryCode: 'CI' },
    gender: 'Masculin',
    deceased: false,
    aliases: [{ id: 'al-1', fullName: 'Lucas Garnier', kind: 'Nom principal', score: 100 }],
    positions: [
      {
        title: 'Ambassadeur',
        organisation: 'Ministère des Affaires étrangères',
        country: 'Côte d’Ivoire',
        from: '2011-06-01',
        to: '2018-04-30',
      },
    ],
    organisations: ['Ministère des Affaires étrangères de Côte d’Ivoire'],
    isPep: true,
    pepCategory: 'PEP étrangère — corps diplomatique',
    sanctions: [],
    relatedParties: [],
    sources: [{ name: 'Registre diplomatique — Côte d’Ivoire', publishedAt: '2011-06-15', kind: 'Officielle' }],
    lastUpdatedAt: daysAgo(200),
    summary:
      "Ancien ambassadeur de Côte d'Ivoire. Homonymie parfaite sur le nom complet, mais aucun autre critère d'identité ne concorde.",
  },
  match: matchDetail(
    [
      { attribute: 'lastName', score: 100, weight: 26, result: 'MATCH', rationale: 'Correspondance exacte.' },
      { attribute: 'firstName', score: 100, weight: 20, result: 'MATCH', rationale: 'Correspondance exacte.' },
      {
        attribute: 'birthDate',
        score: 0,
        weight: 24,
        result: 'DIVERGENCE',
        rationale: 'Trente-huit ans d’écart.',
      },
      {
        attribute: 'nationality',
        score: 0,
        weight: 9,
        result: 'DIVERGENCE',
        rationale: 'Française contre ivoirienne.',
      },
      { attribute: 'residenceCountry', score: 0, weight: 5, result: 'DIVERGENCE', rationale: 'France contre Côte d’Ivoire.' },
      { attribute: 'address', score: 0, weight: 10, result: 'DIVERGENCE', rationale: 'Rennes contre Abidjan.' },
      { attribute: 'birthPlace', score: 0, weight: 6, result: 'DIVERGENCE', rationale: 'Rennes contre Abidjan.' },
    ],
    'al-1',
    daysAgo(17),
  ),
  generatedAt: daysAgo(17),
  assignment: {
    userId: 'u-marc',
    userName: 'Marc Dupont',
    userLevel: 'LEVEL_1',
    userHue: 168,
    assignedAt: daysAgo(17),
    assignedByName: 'Marc Dupont',
  },
  resolution: {
    decision: 'HOMONYM',
    decidedById: 'u-marc',
    decidedByName: 'Marc Dupont',
    decidedByLevel: 'LEVEL_1',
    decidedAt: daysAgo(16.8),
    comment:
      "Les éléments d'identification disponibles permettent d'écarter la correspondance avec la personne listée : trente-huit ans d'écart sur la date de naissance, nationalité et pays de résidence différents. Homonymie sur le seul nom complet.",
    level: 1,
  },
  lastActionLabel: 'Décision : homonyme',
  lastActionAt: daysAgo(16.8),
  commentCount: 1,
  reopenCount: 0,
  triggeredBy: 'Screening quotidien — base clients actifs',
  batchId: 'BATCH-2026-0722-B',
};

/* --- A-82501 — neutralisée par le niveau 2 --------------------------------- */

const alertNeutralized: Alert = {
  id: 'alr-82501',
  reference: 'A-82501',
  type: 'RCA',
  status: 'PROCESSED',
  priority: 'HIGH',
  subsidiaryId: 'sub-lu',
  client: {
    id: 'cli-80652',
    reference: 'LU-80652-WEB',
    firstName: 'Anna',
    lastName: 'Weber',
    birthDate: '1983-05-27',
    birthPlace: 'Trèves, Allemagne',
    nationality: 'Allemande',
    nationalityCode: 'DE',
    residenceCountry: 'Luxembourg',
    address: {
      line1: '22 boulevard Royal',
      city: 'Luxembourg',
      postalCode: 'L-2449',
      country: 'Luxembourg',
      countryCode: 'LU',
    },
    relationshipStartDate: '2017-10-02',
    occupation: 'Directrice financière',
    employer: 'Helios Fund Services',
    clientSegment: 'Banque privée',
    aliases: ['Anna Weber-Klein'],
    subsidiaryId: 'sub-lu',
    annualFlowEur: 3_150_000,
    riskRating: 'MODÉRÉ',
    identityDocument: 'Passeport DE C0K4M2P91',
  },
  profile: {
    id: 'prf-fa-24880',
    providerId: 'FA-24880',
    provider: 'Factiva',
    firstName: 'Anna',
    lastName: 'Weber',
    birthDate: '1983-05-27',
    birthDateApproximate: false,
    birthPlace: 'Trèves, Allemagne',
    nationality: 'Allemande',
    nationalityCode: 'DE',
    countries: ['Allemagne', 'Luxembourg'],
    address: { line1: 'Hauptmarkt 12', city: 'Trèves', country: 'Allemagne', countryCode: 'DE' },
    gender: 'Féminin',
    deceased: false,
    aliases: [
      { id: 'al-1', fullName: 'Anna Weber', kind: 'Nom principal', score: 98 },
      { id: 'al-2', fullName: 'Anna Weber-Klein', kind: 'Nom d’usage', score: 92 },
    ],
    positions: [],
    organisations: [],
    isPep: false,
    pepCategory: null,
    sanctions: [],
    relatedParties: [
      {
        name: 'Dieter Klein',
        relationship: 'Homonyme du conjoint d’une PEP régionale allemande',
        nature: 'Famille',
      },
    ],
    sources: [{ name: 'Handelsregister — Registre allemand', publishedAt: '2023-11-08', kind: 'Registre' }],
    lastUpdatedAt: daysAgo(45),
    summary:
      "Rapprochement établi par filiation supposée avec une personne politiquement exposée régionale. Le lien familial n'a pas pu être confirmé.",
  },
  match: matchDetail(
    [
      { attribute: 'lastName', score: 100, weight: 26, result: 'MATCH', rationale: 'Correspondance exacte.' },
      { attribute: 'firstName', score: 100, weight: 20, result: 'MATCH', rationale: 'Correspondance exacte.' },
      { attribute: 'birthDate', score: 100, weight: 24, result: 'MATCH', rationale: 'Date identique.' },
      { attribute: 'nationality', score: 100, weight: 9, result: 'MATCH', rationale: 'Nationalité allemande.' },
      {
        attribute: 'residenceCountry',
        score: 50,
        weight: 5,
        result: 'PARTIAL',
        rationale: 'Le Luxembourg figure en pays secondaire sur la fiche.',
      },
      {
        attribute: 'address',
        score: 30,
        weight: 10,
        result: 'DIVERGENCE',
        rationale: 'Luxembourg contre Trèves ; les deux villes sont toutefois limitrophes.',
      },
      { attribute: 'birthPlace', score: 100, weight: 6, result: 'MATCH', rationale: 'Trèves confirmé.' },
    ],
    'al-1',
    daysAgo(24),
  ),
  generatedAt: daysAgo(24),
  assignment: {
    userId: 'u-clara',
    userName: 'Clara Vasseur',
    userLevel: 'LEVEL_2',
    userHue: 340,
    assignedAt: daysAgo(23.5),
    assignedByName: 'Clara Vasseur',
  },
  resolution: {
    decision: 'NEUTRALIZED',
    decidedById: 'u-clara',
    decidedByName: 'Clara Vasseur',
    decidedByLevel: 'LEVEL_2',
    decidedAt: daysAgo(22),
    comment:
      "L'identité concorde mais le lien de parenté allégué avec la personne politiquement exposée n'est pas établi : le registre allemand ne fait apparaître aucun lien matrimonial ou familial. Le rapprochement RCA repose sur une homonymie du nom d'usage. Alerte neutralisée.",
    level: 2,
  },
  lastActionLabel: 'Décision : neutralisée',
  lastActionAt: daysAgo(22),
  commentCount: 3,
  reopenCount: 0,
  triggeredBy: 'Screening hebdomadaire — bénéficiaires effectifs',
  batchId: 'BATCH-2026-0715-C',
};

/* --- A-82430 — alerte rouverte --------------------------------------------- */

const alertReopened: Alert = {
  id: 'alr-82430',
  reference: 'A-82430',
  type: 'SANCTION',
  status: 'REOPENED',
  priority: 'CRITICAL',
  subsidiaryId: 'sub-fr',
  client: {
    id: 'cli-90337',
    reference: 'FR-90337-KOV',
    firstName: 'Dmitri',
    lastName: 'Kovalenko',
    birthDate: '1980-01-14',
    birthPlace: 'Kharkiv, Ukraine',
    nationality: 'Ukrainienne',
    nationalityCode: 'UA',
    residenceCountry: 'France',
    address: {
      line1: '44 rue du Faubourg Saint-Honoré',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      countryCode: 'FR',
    },
    relationshipStartDate: '2018-05-30',
    occupation: 'Négociant en matières premières',
    employer: 'Steppe Commodities SA',
    clientSegment: 'Entreprises',
    aliases: ['Dmytro Kovalenko'],
    subsidiaryId: 'sub-fr',
    annualFlowEur: 8_400_000,
    riskRating: 'ÉLEVÉ',
    identityDocument: 'Passeport UA FE449281',
  },
  profile: {
    id: 'prf-fa-11907',
    providerId: 'FA-11907',
    provider: 'Factiva',
    firstName: 'Dmytro',
    lastName: 'Kovalenko',
    birthDate: '1980-01-14',
    birthDateApproximate: false,
    birthPlace: 'Kharkiv, Ukraine',
    nationality: 'Ukrainienne',
    nationalityCode: 'UA',
    countries: ['Ukraine', 'France', 'Suisse'],
    address: {
      line1: '44 rue du Faubourg Saint-Honoré',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      countryCode: 'FR',
    },
    gender: 'Masculin',
    deceased: false,
    aliases: [
      { id: 'al-1', fullName: 'Dmytro Kovalenko', kind: 'Nom principal', score: 94 },
      { id: 'al-2', fullName: 'Dmitri Kovalenko', kind: 'Translittération', script: 'Latin', score: 98 },
      { id: 'al-3', fullName: 'Дмитро Коваленко', kind: 'Translittération', script: 'Cyrillique', score: 91 },
    ],
    positions: [
      {
        title: 'Directeur général',
        organisation: 'Steppe Commodities SA',
        country: 'Suisse',
        from: '2016-09-01',
        to: null,
      },
    ],
    organisations: ['Steppe Commodities SA'],
    isPep: false,
    pepCategory: null,
    sanctions: [
      {
        programme: 'Liste nationale de gel des avoirs',
        authority: 'Direction générale du Trésor (France)',
        listedOn: daysAgo(3).slice(0, 10),
        reference: 'FR-GEL-2026-0142',
        measures: 'Gel des avoirs — mesure nationale',
        active: true,
      },
    ],
    relatedParties: [
      { name: 'Steppe Commodities SA', relationship: 'Dirigeant et actionnaire', nature: 'Entité liée' },
    ],
    sources: [
      { name: 'Registre national des gels — DG Trésor', publishedAt: daysAgo(3).slice(0, 10), kind: 'Officielle' },
    ],
    lastUpdatedAt: daysAgo(3),
    summary:
      "Négociant en matières premières inscrit récemment sur la liste nationale française de gel des avoirs. L'inscription est postérieure à la première analyse de l'alerte.",
  },
  match: matchDetail(
    [
      { attribute: 'lastName', score: 100, weight: 26, result: 'MATCH', rationale: 'Correspondance exacte.' },
      {
        attribute: 'firstName',
        score: 92,
        weight: 20,
        result: 'MATCH',
        rationale: '« Dmitri » et « Dmytro » sont deux translittérations du même prénom.',
      },
      { attribute: 'birthDate', score: 100, weight: 24, result: 'MATCH', rationale: 'Date identique.' },
      { attribute: 'nationality', score: 100, weight: 9, result: 'MATCH', rationale: 'Nationalité ukrainienne.' },
      { attribute: 'residenceCountry', score: 100, weight: 5, result: 'MATCH', rationale: 'France.' },
      { attribute: 'address', score: 100, weight: 10, result: 'MATCH', rationale: 'Adresse strictement identique.' },
      { attribute: 'birthPlace', score: 100, weight: 6, result: 'MATCH', rationale: 'Kharkiv confirmé.' },
    ],
    'al-2',
    daysAgo(38),
  ),
  generatedAt: daysAgo(38),
  assignment: {
    userId: 'u-nadia',
    userName: 'Nadia Belkacem',
    userLevel: 'LEVEL_2',
    userHue: 288,
    assignedAt: hoursAgo(2.5),
    assignedByName: 'Amélie Rousseau',
  },
  resolution: null,
  lastActionLabel: 'Alerte rouverte',
  lastActionAt: hoursAgo(2.5),
  commentCount: 5,
  reopenCount: 1,
  triggeredBy: 'Réévaluation — mise à jour de la liste nationale de gel',
  batchId: 'BATCH-2026-0701-A',
};

/**
 * La priorité obéit à la même règle pour toutes les alertes, écrites à la main
 * ou générées : elle se déduit du score et du dispositif. La recalculer ici
 * évite qu'une priorité saisie en dur diverge du score effectivement affiché.
 */
const HANDCRAFTED: readonly Alert[] = [
  alertJeanDupont,
  alertMarieMartin,
  alertJohnSmith,
  alertSophieBernard,
  alertPierreLaurent,
  alertViktor,
  alertHomonym,
  alertNeutralized,
  alertReopened,
].map((alert) => ({ ...alert, priority: derivePriority(alert.match.score, alert.type) }));

/* =============================================================================
   GÉNÉRATEUR — volume complémentaire
   ========================================================================== */

const FIRST_NAMES = [
  'Camille', 'Antoine', 'Julie', 'Nicolas', 'Émilie', 'Laurent', 'Céline', 'Mathieu',
  'Aurélie', 'Sébastien', 'Isabelle', 'Vincent', 'Nathalie', 'Guillaume', 'Sandrine',
  'Alexandre', 'Valérie', 'Fabien', 'Caroline', 'Damien', 'Elena', 'Ahmed', 'Yuki',
  'Rafael', 'Ingrid', 'Omar', 'Beatriz', 'Sven', 'Fatima', 'Marco',
];

const LAST_NAMES = [
  'Moreau', 'Lefebvre', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Dupuis', 'Lambert',
  'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
  'Perrin', 'Morin', 'Mathieu', 'Clement', 'Novak', 'Haddad', 'Tanaka', 'Silva',
  'Andersson', 'Khalil', 'Ferreira', 'Larsen', 'Ben Salah', 'Rossi',
];

const OCCUPATIONS = [
  'Chef d’entreprise', 'Médecin', 'Avocat', 'Cadre bancaire', 'Ingénieur',
  'Commerçant', 'Consultant', 'Expert-comptable', 'Promoteur immobilier', 'Retraité',
  'Négociant', 'Gérant de fonds', 'Restaurateur', 'Transporteur',
];

const EMPLOYERS = [
  'Novacap SAS', 'Groupe Berthier', 'Atlas Consulting', 'Nordic Trade AB', 'Verdi Immobilier',
  'Helios Fund Services', 'Cabinet Sorel', 'Meridian Logistics SAS', 'Steppe Commodities SA',
  'Delta Maritime Ltd', 'Sirius Energy', 'Pacific Grain Corp',
];

const CITIES: readonly { city: string; country: string; code: string; postal: string }[] = [
  { city: 'Paris', country: 'France', code: 'FR', postal: '75011' },
  { city: 'Lyon', country: 'France', code: 'FR', postal: '69003' },
  { city: 'Marseille', country: 'France', code: 'FR', postal: '13006' },
  { city: 'Luxembourg', country: 'Luxembourg', code: 'LU', postal: 'L-1150' },
  { city: 'Bruxelles', country: 'Belgique', code: 'BE', postal: '1000' },
  { city: 'Genève', country: 'Suisse', code: 'CH', postal: '1201' },
  { city: 'Casablanca', country: 'Maroc', code: 'MA', postal: '20250' },
  { city: 'Milan', country: 'Italie', code: 'IT', postal: '20121' },
  { city: 'Francfort', country: 'Allemagne', code: 'DE', postal: '60311' },
  { city: 'Dubaï', country: 'Émirats arabes unis', code: 'AE', postal: '' },
];

const NATIONALITIES: readonly { label: string; code: string }[] = [
  { label: 'Française', code: 'FR' },
  { label: 'Belge', code: 'BE' },
  { label: 'Luxembourgeoise', code: 'LU' },
  { label: 'Suisse', code: 'CH' },
  { label: 'Marocaine', code: 'MA' },
  { label: 'Italienne', code: 'IT' },
  { label: 'Allemande', code: 'DE' },
  { label: 'Britannique', code: 'GB' },
  { label: 'Russe', code: 'RU' },
  { label: 'Ukrainienne', code: 'UA' },
];

const SANCTION_PROGRAMMES: readonly { programme: string; authority: string }[] = [
  { programme: 'Règlement (UE) 269/2014 — mesures restrictives Ukraine', authority: 'Union européenne' },
  { programme: 'Règlement (UE) 765/2006 — mesures restrictives Biélorussie', authority: 'Union européenne' },
  { programme: 'Specially Designated Nationals List', authority: 'OFAC (États-Unis)' },
  { programme: 'Consolidated List', authority: 'HM Treasury (Royaume-Uni)' },
  { programme: 'Liste récapitulative du Conseil de sécurité', authority: 'Nations unies' },
  { programme: 'Liste nationale de gel des avoirs', authority: 'Direction générale du Trésor (France)' },
];

const PEP_POSITIONS: readonly { title: string; organisation: string }[] = [
  { title: 'Député', organisation: 'Assemblée nationale' },
  { title: 'Maire', organisation: 'Municipalité' },
  { title: 'Directeur général', organisation: 'Agence publique de l’énergie' },
  { title: 'Ambassadeur', organisation: 'Ministère des Affaires étrangères' },
  { title: 'Conseiller ministériel', organisation: 'Ministère de l’Intérieur' },
  { title: 'Président du conseil d’administration', organisation: 'Banque centrale' },
  { title: 'Magistrat', organisation: 'Cour suprême' },
];

const TRIGGERS = [
  'Screening quotidien — base clients actifs',
  'Screening hebdomadaire — bénéficiaires effectifs',
  'Screening mensuel — revue de portefeuille',
  'Screening à l’entrée en relation',
  'Réévaluation — mise à jour de liste',
];

const SEGMENTS = ['Banque privée', 'Clientèle particuliers', 'Entreprises', 'Professionnels', 'Clientèle patrimoniale'];

const ANALYSTS: readonly { id: string; name: string; level: 'LEVEL_1' | 'LEVEL_2'; hue: number; sub: string }[] = [
  { id: 'u-sophie', name: 'Sophie Martin', level: 'LEVEL_2', hue: 232, sub: 'sub-fr' },
  { id: 'u-marc', name: 'Marc Dupont', level: 'LEVEL_1', hue: 168, sub: 'sub-fr' },
  { id: 'u-nadia', name: 'Nadia Belkacem', level: 'LEVEL_2', hue: 288, sub: 'sub-fr' },
  { id: 'u-thomas', name: 'Thomas Leroy', level: 'LEVEL_1', hue: 22, sub: 'sub-fr' },
  { id: 'u-hugo', name: 'Hugo Fontaine', level: 'LEVEL_1', hue: 200, sub: 'sub-fr' },
  { id: 'u-clara', name: 'Clara Vasseur', level: 'LEVEL_2', hue: 340, sub: 'sub-lu' },
  { id: 'u-julien', name: 'Julien Mercier', level: 'LEVEL_1', hue: 130, sub: 'sub-be' },
  { id: 'u-lea', name: 'Léa Girard', level: 'LEVEL_2', hue: 258, sub: 'sub-ch' },
  { id: 'u-karim', name: 'Karim Benali', level: 'LEVEL_1', hue: 48, sub: 'sub-ma' },
];

const SUBSIDIARY_IDS = ['sub-fr', 'sub-fr', 'sub-fr', 'sub-lu', 'sub-be', 'sub-ch', 'sub-ma'];

/** Décrit la qualité voulue du rapprochement, pour piloter la génération. */
type MatchQuality = 'STRONG' | 'GOOD' | 'AMBIGUOUS' | 'WEAK';

function qualityFromScoreTarget(target: number): MatchQuality {
  if (target >= 90) return 'STRONG';
  if (target >= 78) return 'GOOD';
  if (target >= 60) return 'AMBIGUOUS';
  return 'WEAK';
}

function buildCriteria(quality: MatchQuality): CriterionSeed[] {
  const exact = (attribute: MatchAttribute, weight: number, rationale: string): CriterionSeed => ({
    attribute,
    weight,
    score: 100,
    result: 'MATCH',
    rationale,
  });

  switch (quality) {
    case 'STRONG':
      return [
        exact('lastName', 26, 'Correspondance exacte.'),
        exact('firstName', 20, 'Correspondance exacte.'),
        exact('birthDate', 24, 'Date de naissance identique au jour près.'),
        exact('nationality', 9, 'Nationalité identique.'),
        exact('residenceCountry', 5, 'Pays de résidence identique.'),
        {
          attribute: 'address',
          weight: 10,
          score: randInt(78, 100),
          result: 'MATCH',
          rationale: 'Ville et pays concordants.',
        },
        {
          attribute: 'birthPlace',
          weight: 6,
          score: randInt(80, 100),
          result: 'MATCH',
          rationale: 'Lieu de naissance confirmé par la source.',
        },
      ];
    case 'GOOD':
      return [
        exact('lastName', 26, 'Correspondance exacte.'),
        {
          attribute: 'firstName',
          weight: 20,
          score: randInt(72, 90),
          result: 'PARTIAL',
          rationale: 'Diminutif ou variante orthographique reconnue du prénom.',
        },
        exact('birthDate', 24, 'Date de naissance identique.'),
        exact('nationality', 9, 'Nationalité identique.'),
        {
          attribute: 'residenceCountry',
          weight: 5,
          score: 50,
          result: 'PARTIAL',
          rationale: 'Le pays figure en résidence secondaire sur la fiche.',
        },
        {
          attribute: 'address',
          weight: 10,
          score: randInt(20, 60),
          result: 'DIVERGENCE',
          rationale: 'Villes différentes, pays concordant.',
        },
        {
          attribute: 'birthPlace',
          weight: 6,
          score: 0,
          result: 'MISSING',
          rationale: 'Lieu de naissance absent de la fiche fournisseur.',
        },
      ];
    case 'AMBIGUOUS':
      return [
        {
          attribute: 'lastName',
          weight: 26,
          score: randInt(70, 88),
          result: 'PARTIAL',
          rationale: 'Similarité phonétique élevée mais orthographes distinctes.',
        },
        {
          attribute: 'firstName',
          weight: 20,
          score: randInt(65, 88),
          result: 'PARTIAL',
          rationale: 'Racine commune, terminaison différente.',
        },
        {
          attribute: 'birthDate',
          weight: 24,
          score: randInt(40, 70),
          result: 'UNCERTAIN',
          rationale: 'La fiche ne publie que l’année de naissance.',
        },
        exact('nationality', 9, 'Nationalité identique.'),
        {
          attribute: 'residenceCountry',
          weight: 5,
          score: randInt(0, 60),
          result: 'UNCERTAIN',
          rationale: 'Plusieurs pays de rattachement sur la fiche.',
        },
        {
          attribute: 'address',
          weight: 10,
          score: randInt(0, 40),
          result: 'DIVERGENCE',
          rationale: 'Aucun élément d’adresse commun.',
        },
        {
          attribute: 'birthPlace',
          weight: 6,
          score: 0,
          result: 'MISSING',
          rationale: 'Non renseigné de part et d’autre.',
        },
      ];
    case 'WEAK':
      return [
        {
          attribute: 'lastName',
          weight: 26,
          score: randInt(55, 72),
          result: 'PARTIAL',
          rationale: 'Racine patronymique commune uniquement.',
        },
        {
          attribute: 'firstName',
          weight: 20,
          score: randInt(45, 70),
          result: 'PARTIAL',
          rationale: 'Initiale et sonorité proches.',
        },
        {
          attribute: 'birthDate',
          weight: 24,
          score: 0,
          result: 'DIVERGENCE',
          rationale: 'Écart supérieur à cinq ans.',
        },
        {
          attribute: 'nationality',
          weight: 9,
          score: 0,
          result: 'DIVERGENCE',
          rationale: 'Nationalités différentes.',
        },
        {
          attribute: 'residenceCountry',
          weight: 5,
          score: 0,
          result: 'DIVERGENCE',
          rationale: 'Pays de résidence différents.',
        },
        {
          attribute: 'address',
          weight: 10,
          score: 0,
          result: 'DIVERGENCE',
          rationale: 'Aucun élément commun.',
        },
        {
          attribute: 'birthPlace',
          weight: 6,
          score: 0,
          result: 'MISSING',
          rationale: 'Non renseigné.',
        },
      ];
  }
}

function buildAliases(firstName: string, lastName: string, baseScore: number): ProfileAlias[] {
  const aliases: ProfileAlias[] = [
    { id: 'al-1', fullName: `${firstName} ${lastName}`, kind: 'Nom principal', score: baseScore },
  ];
  if (rand() > 0.35) {
    aliases.push({
      id: 'al-2',
      fullName: `${firstName.charAt(0)}. ${lastName}`,
      kind: 'Variante',
      score: Math.max(40, baseScore - randInt(6, 18)),
    });
  }
  if (rand() > 0.6) {
    aliases.push({
      id: 'al-3',
      fullName: `${firstName} ${lastName.toUpperCase()}`,
      kind: 'Translittération',
      script: 'Latin',
      score: Math.max(38, baseScore - randInt(10, 24)),
    });
  }
  return aliases;
}

function generateAlert(index: number): Alert {
  const type: ScreeningType = pick<ScreeningType>(['SANCTION', 'PEP', 'RCA', 'PEP', 'SANCTION']);
  const scoreTarget = pick([42, 51, 58, 63, 67, 71, 74, 78, 82, 85, 88, 91, 94, 96, 98]);
  const quality = qualityFromScoreTarget(scoreTarget);
  const seeds = buildCriteria(quality);
  const subsidiaryId = pick(SUBSIDIARY_IDS);

  const clientFirst = pick(FIRST_NAMES);
  const clientLast = pick(LAST_NAMES);
  const profileFirst = quality === 'STRONG' || quality === 'GOOD' ? clientFirst : pick(FIRST_NAMES);
  const profileLast = quality === 'STRONG' || quality === 'GOOD' ? clientLast : pick(LAST_NAMES);

  const clientCity = pick(CITIES);
  const profileCity = quality === 'STRONG' ? clientCity : pick(CITIES);
  const nationality = pick(NATIONALITIES);
  const profileNationality = quality === 'WEAK' ? pick(NATIONALITIES) : nationality;

  const birthYear = randInt(1952, 1998);
  const birthMonth = randInt(1, 12);
  const birthDay = randInt(1, 28);
  const clientBirth = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  const profileBirthYear = quality === 'WEAK' ? birthYear - randInt(4, 15) : birthYear;
  const profileBirth = `${profileBirthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

  const ageHours = randInt(1, 620);
  const generatedAt = hoursAgo(ageHours);

  const match = matchDetail(seeds, 'al-1', generatedAt);
  const priority = derivePriority(match.score, type);

  /* Le statut dépend de l'âge : les alertes anciennes sont majoritairement
     traitées, les récentes attendent encore une prise en charge. */
  const roll = rand();
  let status: AlertStatus;
  if (ageHours > 300) {
    status = roll > 0.12 ? 'PROCESSED' : 'ESCALATED';
  } else if (ageHours > 120) {
    status = roll > 0.55 ? 'PROCESSED' : roll > 0.35 ? 'IN_PROGRESS' : roll > 0.2 ? 'ESCALATED' : 'ASSIGNED';
  } else if (ageHours > 40) {
    status = roll > 0.7 ? 'ASSIGNED' : roll > 0.45 ? 'IN_PROGRESS' : roll > 0.3 ? 'ESCALATED' : 'TO_PROCESS';
  } else {
    status = roll > 0.45 ? 'TO_PROCESS' : roll > 0.2 ? 'ASSIGNED' : 'IN_PROGRESS';
  }

  const eligibleAnalysts = ANALYSTS.filter((a) => a.sub === subsidiaryId);
  const analyst = eligibleAnalysts.length > 0 ? pick(eligibleAnalysts) : pick(ANALYSTS);
  const needsAssignment = status !== 'TO_PROCESS';

  const assignment = needsAssignment
    ? {
        userId: analyst.id,
        userName: analyst.name,
        userLevel: analyst.level,
        userHue: analyst.hue,
        assignedAt: hoursAgo(ageHours - randInt(1, Math.max(2, Math.floor(ageHours / 2)))),
        assignedByName: pick(ANALYSTS).name,
      }
    : null;

  let resolution: Alert['resolution'] = null;
  if (status === 'PROCESSED') {
    /* Un score faible se solde presque toujours par une homonymie ; un score
       très élevé conduit plus souvent à une avération. */
    const decisionRoll = rand();
    const decision =
      match.score >= 90
        ? decisionRoll > 0.55
          ? 'CONFIRMED'
          : 'NEUTRALIZED'
        : match.score >= 70
          ? decisionRoll > 0.6
            ? 'NEUTRALIZED'
            : 'HOMONYM'
          : 'HOMONYM';

    const decidedAt = hoursAgo(Math.max(0.5, ageHours - randInt(2, Math.max(3, Math.floor(ageHours * 0.7)))));
    const level = decision === 'HOMONYM' ? 1 : 2;
    const decider =
      level === 1
        ? (eligibleAnalysts.find((a) => a.level === 'LEVEL_1') ?? analyst)
        : (eligibleAnalysts.find((a) => a.level === 'LEVEL_2') ?? analyst);

    const comments: Record<typeof decision, string> = {
      HOMONYM:
        "Les éléments d'identification disponibles permettent d'écarter la correspondance avec la personne listée. Divergences sur la date de naissance et le pays de résidence.",
      NEUTRALIZED:
        "Analyse documentaire complète réalisée. Les pièces justificatives fournies par le client écartent le rapprochement. Alerte neutralisée.",
      CONFIRMED:
        "Correspondance confirmée sur l'ensemble des critères discriminants. Mesures de gel appliquées et dossier transmis à la cellule déclarative.",
    };

    resolution = {
      decision,
      decidedById: decider.id,
      decidedByName: decider.name,
      decidedByLevel: decider.level,
      decidedAt,
      comment: comments[decision],
      level: level as 1 | 2,
    };
  }

  const lastActionAt = resolution?.decidedAt ?? assignment?.assignedAt ?? generatedAt;
  const lastActionLabel = resolution
    ? `Décision : ${resolution.decision === 'HOMONYM' ? 'homonyme' : resolution.decision === 'NEUTRALIZED' ? 'neutralisée' : 'avérée'}`
    : status === 'ESCALATED'
      ? 'Escalade niveau 2'
      : assignment
        ? 'Alerte affectée'
        : 'Alerte générée';

  const reference = `A-${82_000 + index}`;
  const isPep = type === 'PEP' || type === 'RCA';
  const position = pick(PEP_POSITIONS);
  const programme = pick(SANCTION_PROGRAMMES);

  /* La référence client est délivrée par la filiale : elle en porte le code
     pays, pas celui de la nationalité du client. */
  const subsidiaryCode = subsidiaryId.replace('sub-', '').toUpperCase();

  const client: Client = {
    id: `cli-g${index}`,
    reference: `${subsidiaryCode}-${10_000 + index}-${clientLast.slice(0, 3).toUpperCase()}`,
    firstName: clientFirst,
    lastName: clientLast,
    birthDate: clientBirth,
    birthPlace: `${clientCity.city}, ${clientCity.country}`,
    nationality: nationality.label,
    nationalityCode: nationality.code,
    residenceCountry: clientCity.country,
    address: {
      line1: `${randInt(1, 180)} ${pick(['rue', 'avenue', 'boulevard'])} ${pick(['des Lilas', 'Victor Hugo', 'de la République', 'Gambetta', 'du Commerce', 'Saint-Michel'])}`,
      city: clientCity.city,
      postalCode: clientCity.postal || undefined,
      country: clientCity.country,
      countryCode: clientCity.code,
    },
    relationshipStartDate: `${randInt(2005, 2024)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    occupation: pick(OCCUPATIONS),
    employer: pick(EMPLOYERS),
    clientSegment: pick(SEGMENTS),
    aliases: rand() > 0.7 ? [`${clientFirst} ${pick(LAST_NAMES)}`] : [],
    subsidiaryId,
    annualFlowEur: randInt(30, 9_000) * 1000,
    riskRating: match.score >= 88 ? 'ÉLEVÉ' : match.score >= 70 ? 'MODÉRÉ' : 'FAIBLE',
    identityDocument: rand() > 0.3 ? `CNI ${randInt(100000000000, 999999999999)}` : null,
  };

  const profile: ScreeningProfile = {
    id: `prf-g${index}`,
    providerId: `FA-${20_000 + index * 7}`,
    provider: 'Factiva',
    firstName: profileFirst,
    lastName: profileLast,
    birthDate: quality === 'AMBIGUOUS' ? `${profileBirthYear}-01-01` : profileBirth,
    birthDateApproximate: quality === 'AMBIGUOUS',
    birthPlace: quality === 'STRONG' ? `${clientCity.city}, ${clientCity.country}` : null,
    nationality: profileNationality.label,
    nationalityCode: profileNationality.code,
    countries: [profileCity.country, ...(rand() > 0.6 ? [pick(CITIES).country] : [])],
    address: {
      line1: `${randInt(1, 90)} ${pick(['Main Street', 'Hauptstrasse', 'Via Roma', 'rue Centrale'])}`,
      city: profileCity.city,
      postalCode: profileCity.postal || undefined,
      country: profileCity.country,
      countryCode: profileCity.code,
    },
    gender: rand() > 0.5 ? 'Masculin' : 'Féminin',
    deceased: rand() > 0.95,
    aliases: buildAliases(profileFirst, profileLast, Math.min(100, match.score + randInt(0, 5))),
    positions: isPep
      ? [
          {
            title: position.title,
            organisation: position.organisation,
            country: profileCity.country,
            from: `${randInt(2005, 2018)}-01-01`,
            to: rand() > 0.5 ? `${randInt(2019, 2025)}-12-31` : null,
          },
        ]
      : [],
    organisations: isPep ? [position.organisation] : [pick(EMPLOYERS)],
    isPep,
    pepCategory: isPep
      ? type === 'RCA'
        ? 'Proche d’une personne politiquement exposée'
        : pick(['PEP nationale — fonction élective', 'PEP étrangère — haute fonction publique', 'PEP internationale'])
      : null,
    sanctions:
      type === 'SANCTION'
        ? [
            {
              programme: programme.programme,
              authority: programme.authority,
              listedOn: `${randInt(2014, 2025)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
              reference: `REF-${randInt(1000, 9999)}`,
              measures: pick(['Gel des avoirs', 'Gel des avoirs — interdiction de voyage', 'Blocage total des avoirs']),
              active: rand() > 0.1,
            },
          ]
        : [],
    relatedParties:
      type === 'RCA'
        ? [
            {
              name: `${pick(FIRST_NAMES)} ${profileLast}`,
              relationship: pick(['Conjoint', 'Parent', 'Associé au capital', 'Frère ou sœur']),
              nature: pick<'Famille' | 'Associé' | 'Entité liée'>(['Famille', 'Associé']),
            },
          ]
        : [],
    sources: [
      {
        name: pick([
          'Journal officiel de l’Union européenne',
          'OFAC — SDN List',
          'Registre du commerce',
          'Reuters',
          'Le Monde',
        ]),
        publishedAt: `${randInt(2019, 2026)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
        kind: pick<'Officielle' | 'Presse' | 'Registre'>(['Officielle', 'Presse', 'Registre']),
      },
    ],
    lastUpdatedAt: daysAgo(randInt(1, 180)),
    summary:
      type === 'SANCTION'
        ? `Personne inscrite au titre du programme « ${programme.programme} » par ${programme.authority}.`
        : type === 'PEP'
          ? `${position.title} — ${position.organisation}. Statut de personne politiquement exposée actif.`
          : `Identifié comme proche d'une personne politiquement exposée. Rapprochement établi par lien familial ou capitalistique.`,
  };

  return {
    id: `alr-g${index}`,
    reference,
    type,
    status,
    priority,
    subsidiaryId,
    client,
    profile,
    match,
    generatedAt,
    assignment,
    resolution,
    lastActionLabel,
    lastActionAt,
    commentCount: status === 'TO_PROCESS' ? randInt(0, 1) : randInt(0, 5),
    reopenCount: 0,
    triggeredBy: pick(TRIGGERS),
    batchId: `BATCH-2026-${String(randInt(1, 12)).padStart(2, '0')}${String(randInt(10, 28))}-${pick(['A', 'B', 'C', 'D'])}`,
  };
}

const GENERATED: Alert[] = Array.from({ length: 74 }, (_, i) => generateAlert(i + 100));

/** Jeu complet, trié du plus récent au plus ancien. */
export const ALERTS: readonly Alert[] = [...HANDCRAFTED, ...GENERATED].sort(
  (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
);

/** Référence de l'alerte mise en avant dans la démonstration. */
export const SHOWCASE_ALERT_ID = alertJeanDupont.id;
