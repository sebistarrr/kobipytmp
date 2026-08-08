import type { Routes } from '@angular/router';

import { AppShellComponent } from './layout/app-shell/app-shell';
import { authGuard, requirePermission } from './core/guards/permission.guard';

/**
 * Arborescence de l'application.
 *
 * Chaque écran est chargé à la demande : la coquille et le tableau de bord
 * partent seuls au premier rendu, les écrans d'investigation et
 * d'administration ne sont téléchargés que lorsqu'ils sont ouverts.
 */
export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },

      {
        path: 'tableau-de-bord',
        title: 'Tableau de bord — Vigilance',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },

      {
        path: 'alertes',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'a-traiter' },
          {
            path: 'a-traiter',
            title: 'Alertes à traiter — Vigilance',
            loadComponent: () => import('./features/alerts/inbox/inbox').then((m) => m.InboxComponent),
          },
          {
            path: 'mes-alertes',
            title: 'Mes alertes — Vigilance',
            loadComponent: () =>
              import('./features/alerts/inbox/inbox').then((m) => m.InboxComponent),
            data: { scope: 'mine' },
          },
          {
            path: 'traitees',
            title: 'Alertes traitées — Vigilance',
            loadComponent: () =>
              import('./features/alerts/processed/processed').then((m) => m.ProcessedComponent),
          },
          {
            /* Placé en dernier : les segments littéraux ci-dessus priment. */
            path: ':alertId',
            title: 'Investigation — Vigilance',
            canActivate: [requirePermission('alert:view')],
            loadComponent: () =>
              import('./features/alerts/investigation/investigation').then(
                (m) => m.InvestigationComponent,
              ),
          },
        ],
      },

      {
        path: 'reporting',
        title: 'Reporting — Vigilance',
        canActivate: [requirePermission('reporting:view')],
        loadComponent: () => import('./features/reporting/reporting').then((m) => m.ReportingComponent),
      },

      {
        path: 'administration',
        title: 'Administration — Vigilance',
        loadComponent: () =>
          import('./features/administration/administration').then((m) => m.AdministrationComponent),
      },

      {
        path: 'acces-refuse',
        title: 'Accès refusé — Vigilance',
        loadComponent: () => import('./features/access-denied/access-denied').then((m) => m.AccessDeniedComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
