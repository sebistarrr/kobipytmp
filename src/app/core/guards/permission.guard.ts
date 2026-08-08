import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import type { Permission } from '../models';

/**
 * Garde de route par permission.
 *
 * Elle évite d'afficher un écran que l'utilisateur ne peut pas exploiter. Ce
 * n'est pas une mesure de sécurité : les données restent protégées côté API.
 */
export function requirePermission(...permissions: readonly Permission[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasAny(...permissions)) return true;
    return router.createUrlTree(['/acces-refuse']);
  };
}

/** Garde d'authentification. La session de démonstration est toujours ouverte. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.currentUser() !== undefined;
};
