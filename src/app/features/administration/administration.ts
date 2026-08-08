import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { AlertStore } from '../../core/state/alert-store';
import {
  PERMISSIONS_BY_LEVEL,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PRIORITY_META,
  SCREENING_TYPE_META,
  USER_LEVEL_META,
  type Permission,
  type Priority,
  type ScreeningType,
  type UserLevel,
} from '../../core/models';
import { AvatarComponent } from '../../shared/ui/avatar/avatar';
import { IconComponent, type IconName } from '../../shared/ui/icon/icon';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header';
import { LevelBadgeComponent } from '../../shared/ui/badges/badges';
import { FrDatePipe } from '../../shared/pipes/format.pipes';

type AdminTab = 'users' | 'subsidiaries' | 'permissions' | 'screening';

/**
 * Administration du dispositif.
 *
 * Écran de référence : il documente qui peut faire quoi, sur quel périmètre, et
 * comment le moteur de screening est paramétré. La matrice des droits y est
 * présentée telle qu'elle est appliquée, afin qu'un contrôleur puisse la
 * vérifier sans lire le code.
 */
@Component({
  selector: 'app-administration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './administration.html',
  styleUrl: './administration.scss',
  imports: [
    PageHeaderComponent,
    IconComponent,
    AvatarComponent,
    LevelBadgeComponent,
    FrDatePipe,
  ],
})
export class AdministrationComponent {
  protected readonly auth = inject(AuthService);
  private readonly store = inject(AlertStore);

  protected readonly tab = signal<AdminTab>('users');

  protected readonly tabs: readonly { id: AdminTab; label: string; icon: IconName }[] = [
    { id: 'users', label: 'Utilisateurs', icon: 'users' },
    { id: 'subsidiaries', label: 'Filiales', icon: 'building' },
    { id: 'permissions', label: 'Matrice des droits', icon: 'lock' },
    { id: 'screening', label: 'Paramétrage du screening', icon: 'radar' },
  ];

  protected readonly canAdminister = computed(() => this.auth.has('admin:users'));

  /* ---------------------------------------------------------------------------
     Utilisateurs
     ------------------------------------------------------------------------ */

  protected readonly users = computed(() =>
    this.auth.allUsers.map((user) => {
      const subsidiary = this.auth.allSubsidiaries.find((item) => item.id === user.subsidiaryId);
      const openLoad = this.store
        .allAlerts()
        .filter((alert) => alert.status !== 'PROCESSED' && alert.assignment?.userId === user.id).length;

      return {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
        subsidiaryName: subsidiary?.name ?? '—',
        subsidiaryCode: subsidiary?.code ?? '—',
        openLoad,
      };
    }),
  );

  protected readonly userStats = computed(() => {
    const users = this.auth.allUsers;
    return {
      total: users.length,
      active: users.filter((user) => user.active).length,
      level1: users.filter((user) => user.level === 'LEVEL_1').length,
      level2: users.filter((user) => user.level === 'LEVEL_2').length,
      admins: users.filter((user) => user.level === 'ADMIN').length,
    };
  });

  /* ---------------------------------------------------------------------------
     Filiales
     ------------------------------------------------------------------------ */

  protected readonly subsidiaries = computed(() =>
    this.auth.allSubsidiaries.map((subsidiary) => {
      const alerts = this.store.allAlerts().filter((alert) => alert.subsidiaryId === subsidiary.id);
      return {
        ...subsidiary,
        analysts: this.auth.allUsers.filter(
          (user) => user.subsidiaryId === subsidiary.id && user.active,
        ).length,
        total: alerts.length,
        open: alerts.filter((alert) => alert.status !== 'PROCESSED').length,
        isActive: subsidiary.id === this.auth.activeSubsidiaryId(),
      };
    }),
  );

  /* ---------------------------------------------------------------------------
     Matrice des droits
     ------------------------------------------------------------------------ */

  protected readonly levels: readonly UserLevel[] = ['LEVEL_1', 'LEVEL_2', 'ADMIN'];
  protected readonly permissionGroups = PERMISSION_GROUPS;

  protected grants(level: UserLevel, permission: Permission): boolean {
    return PERMISSIONS_BY_LEVEL[level].includes(permission);
  }

  protected permissionLabel(permission: Permission): string {
    return PERMISSION_LABELS[permission];
  }

  protected levelLabel(level: UserLevel): string {
    return USER_LEVEL_META[level].shortLabel;
  }

  protected levelDescription(level: UserLevel): string {
    return USER_LEVEL_META[level].description;
  }

  /* ---------------------------------------------------------------------------
     Paramétrage du screening
     ------------------------------------------------------------------------ */

  protected readonly screeningTypes: readonly ScreeningType[] = ['SANCTION', 'PEP', 'RCA'];
  protected readonly priorities: readonly Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  /** Seuils de déclenchement, tels qu'appliqués par le moteur. */
  protected readonly thresholds: readonly {
    type: ScreeningType;
    minScore: number;
    autoClose: number | null;
    frequency: string;
  }[] = [
    { type: 'SANCTION', minScore: 55, autoClose: null, frequency: 'Quotidien · 04h00' },
    { type: 'PEP', minScore: 60, autoClose: 40, frequency: 'Quotidien · 04h30' },
    { type: 'RCA', minScore: 65, autoClose: 45, frequency: 'Hebdomadaire · lundi 05h00' },
  ];

  protected readonly lists: readonly { name: string; authority: string; records: number; updatedAt: string }[] = [
    { name: 'Liste consolidée UE', authority: 'Union européenne', records: 3_412, updatedAt: '2026-08-06' },
    { name: 'SDN List', authority: 'OFAC (États-Unis)', records: 12_884, updatedAt: '2026-08-07' },
    { name: 'UK Sanctions List', authority: 'HM Treasury', records: 4_106, updatedAt: '2026-08-05' },
    { name: 'Liste récapitulative', authority: 'Nations unies', records: 1_027, updatedAt: '2026-08-01' },
    { name: 'Registre national des gels', authority: 'DG Trésor (France)', records: 892, updatedAt: '2026-08-07' },
    { name: 'Base PEP mondiale', authority: 'Factiva', records: 1_842_500, updatedAt: '2026-08-07' },
  ];

  /** Flèches gauche/droite entre les onglets, motif ARIA « tablist ». */
  protected onTabKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();

    const current = this.tabs.findIndex((tab) => tab.id === this.tab());
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = this.tabs[(current + step + this.tabs.length) % this.tabs.length];
    if (!next) return;

    this.tab.set(next.id);
    queueMicrotask(() => document.getElementById(`onglet-${next.id}`)?.focus());
  }

  protected typeMeta(type: ScreeningType) {
    return SCREENING_TYPE_META[type];
  }

  protected priorityMeta(priority: Priority) {
    return PRIORITY_META[priority];
  }
}
