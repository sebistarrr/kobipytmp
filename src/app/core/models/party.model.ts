/**
 * Les deux parties d'un rapprochement : le client connu de la filiale et la
 * fiche de la personne listée renvoyée par le fournisseur de screening
 * (Factiva). Les deux structures partagent volontairement le même vocabulaire
 * d'attributs afin que le comparateur puisse les confronter champ à champ.
 */

export interface Address {
  readonly line1: string;
  readonly city: string;
  readonly postalCode?: string;
  readonly country: string;
  readonly countryCode: string;
}

export function formatAddress(address: Address | null | undefined): string {
  if (!address) return '—';
  const postal = address.postalCode ? `${address.postalCode} ` : '';
  return `${address.line1}, ${postal}${address.city}, ${address.country}`;
}

/* -----------------------------------------------------------------------------
   Client de la filiale
   -------------------------------------------------------------------------- */
export interface Client {
  readonly id: string;
  /** Identifiant client dans le système de la filiale. */
  readonly reference: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string | null;
  readonly birthPlace: string | null;
  readonly nationality: string | null;
  readonly nationalityCode: string | null;
  readonly residenceCountry: string | null;
  readonly address: Address | null;
  /** Date d'entrée en relation d'affaires. */
  readonly relationshipStartDate: string;
  readonly occupation: string | null;
  readonly employer: string | null;
  readonly clientSegment: string;
  readonly aliases: readonly string[];
  readonly subsidiaryId: string;
  /** Volume de flux annuel constaté, en euros. Contextualise le risque. */
  readonly annualFlowEur: number | null;
  readonly riskRating: 'FAIBLE' | 'MODÉRÉ' | 'ÉLEVÉ';
  readonly identityDocument: string | null;
}

export function clientFullName(client: Pick<Client, 'firstName' | 'lastName'>): string {
  return `${client.firstName} ${client.lastName}`;
}

/* -----------------------------------------------------------------------------
   Fiche fournisseur (Factiva)
   -------------------------------------------------------------------------- */

/** Un alias porté par la fiche listée, avec son propre score de rapprochement. */
export interface ProfileAlias {
  readonly id: string;
  readonly fullName: string;
  /** Nature de l'alias telle que qualifiée par la source. */
  readonly kind: 'Nom principal' | 'Translittération' | 'Nom d’usage' | 'Variante' | 'Alias connu';
  readonly script?: string;
  /** Score de rapprochement de cet alias avec l'identité du client, en %. */
  readonly score: number;
}

export interface ProfilePosition {
  readonly title: string;
  readonly organisation: string;
  readonly country: string;
  readonly from: string;
  readonly to: string | null;
}

export interface SanctionListing {
  readonly programme: string;
  readonly authority: string;
  readonly listedOn: string;
  readonly reference: string;
  readonly measures: string;
  readonly active: boolean;
}

export interface RelatedParty {
  readonly name: string;
  readonly relationship: string;
  readonly nature: 'Famille' | 'Associé' | 'Entité liée';
}

export interface SourceReference {
  readonly name: string;
  readonly publishedAt: string;
  readonly kind: 'Officielle' | 'Presse' | 'Registre';
}

/** Fiche de la personne listée renvoyée par le dispositif de screening. */
export interface ScreeningProfile {
  readonly id: string;
  /** Identifiant du fournisseur, cité dans les échanges avec la conformité. */
  readonly providerId: string;
  readonly provider: 'Factiva';
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string | null;
  /** La source publie parfois une plage plutôt qu'une date exacte. */
  readonly birthDateApproximate: boolean;
  readonly birthPlace: string | null;
  readonly nationality: string | null;
  readonly nationalityCode: string | null;
  readonly countries: readonly string[];
  readonly address: Address | null;
  readonly gender: 'Masculin' | 'Féminin' | 'Non renseigné';
  readonly deceased: boolean;
  readonly aliases: readonly ProfileAlias[];
  readonly positions: readonly ProfilePosition[];
  readonly organisations: readonly string[];
  readonly isPep: boolean;
  readonly pepCategory: string | null;
  readonly sanctions: readonly SanctionListing[];
  readonly relatedParties: readonly RelatedParty[];
  readonly sources: readonly SourceReference[];
  readonly lastUpdatedAt: string;
  readonly summary: string;
}

export function profileFullName(profile: Pick<ScreeningProfile, 'firstName' | 'lastName'>): string {
  return `${profile.firstName} ${profile.lastName}`;
}
