import { Injectable, computed, signal } from '@angular/core';

import {
  PERMISSIONS_BY_LEVEL,
  USER_LEVEL_META,
  fullName,
  initials,
  type Permission,
  type Subsidiary,
  type User,
} from '../models';
import { DEFAULT_USER_ID, SUBSIDIARIES, USERS } from '../data/reference.data';

const STORAGE_USER = 'vigilance.user';
const STORAGE_SUBSIDIARY = 'vigilance.subsidiary';

/**
 * Session de l'utilisateur et contexte de travail.
 *
 * Les permissions calculées ici pilotent l'affichage : elles masquent ce que
 * l'utilisateur ne peut pas faire, afin de réduire le bruit et les erreurs.
 * Elles ne protègent rien. Le backend reste seul responsable du contrôle
 * d'habilitation ; toute action doit être revalidée côté serveur.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<User>(this.restoreUser());
  private readonly _activeSubsidiaryId = signal<string>(this.restoreSubsidiary());

  readonly currentUser = this._currentUser.asReadonly();

  readonly displayName = computed(() => fullName(this._currentUser()));
  readonly initials = computed(() => initials(this._currentUser()));
  readonly levelMeta = computed(() => USER_LEVEL_META[this._currentUser().level]);

  /** Ensemble des permissions du niveau courant, recalculé à chaque bascule. */
  readonly permissions = computed<ReadonlySet<Permission>>(
    () => new Set(PERMISSIONS_BY_LEVEL[this._currentUser().level]),
  );

  readonly isLevel1 = computed(() => this._currentUser().level === 'LEVEL_1');
  readonly isLevel2 = computed(() => this._currentUser().level === 'LEVEL_2');
  readonly isAdmin = computed(() => this._currentUser().level === 'ADMIN');

  /** Filiales que l'utilisateur peut consulter. L'administrateur les voit toutes. */
  readonly availableSubsidiaries = computed<readonly Subsidiary[]>(() => {
    const user = this._currentUser();
    if (user.level === 'ADMIN') return SUBSIDIARIES;
    return SUBSIDIARIES.filter((subsidiary) => subsidiary.id === user.subsidiaryId);
  });

  readonly activeSubsidiary = computed<Subsidiary>(() => {
    const id = this._activeSubsidiaryId();
    const available = this.availableSubsidiaries();
    return available.find((subsidiary) => subsidiary.id === id) ?? available[0]!;
  });

  readonly activeSubsidiaryId = computed(() => this.activeSubsidiary().id);

  /** Tous les comptes, exposés pour la bascule de rôle et l'administration. */
  readonly allUsers = USERS;
  readonly allSubsidiaries = SUBSIDIARIES;

  /** Vrai lorsque le niveau courant porte la permission demandée. */
  has(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  /** Vrai lorsque l'utilisateur détient au moins une des permissions listées. */
  hasAny(...permissions: readonly Permission[]): boolean {
    const granted = this.permissions();
    return permissions.some((permission) => granted.has(permission));
  }

  /**
   * Bascule de compte. Dans un déploiement réel, l'identité proviendrait du
   * fournisseur d'identité du groupe ; ici elle permet de parcourir la
   * démonstration sous chaque niveau d'habilitation.
   */
  signInAs(userId: string): void {
    const user = USERS.find((candidate) => candidate.id === userId);
    if (!user) return;

    this._currentUser.set(user);
    this.persist(STORAGE_USER, user.id);

    /* Le contexte de filiale suit l'utilisateur s'il perd l'accès au précédent. */
    const stillAllowed = this.availableSubsidiaries().some(
      (subsidiary) => subsidiary.id === this._activeSubsidiaryId(),
    );
    if (!stillAllowed) {
      this.selectSubsidiary(user.subsidiaryId);
    }
  }

  selectSubsidiary(subsidiaryId: string): void {
    if (!this.availableSubsidiaries().some((subsidiary) => subsidiary.id === subsidiaryId)) return;
    this._activeSubsidiaryId.set(subsidiaryId);
    this.persist(STORAGE_SUBSIDIARY, subsidiaryId);
  }

  /* --- Persistance locale de la session de démonstration ------------------- */

  private restoreUser(): User {
    const stored = this.read(STORAGE_USER);
    return USERS.find((user) => user.id === stored) ?? USERS.find((u) => u.id === DEFAULT_USER_ID)!;
  }

  private restoreSubsidiary(): string {
    const stored = this.read(STORAGE_SUBSIDIARY);
    if (stored && SUBSIDIARIES.some((subsidiary) => subsidiary.id === stored)) return stored;
    return this.restoreUser().subsidiaryId;
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private persist(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Stockage indisponible (navigation privée) : la session reste en mémoire. */
    }
  }
}
