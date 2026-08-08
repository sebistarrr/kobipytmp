import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';

import { AuthService } from '../auth/auth.service';

/**
 * Enrichit chaque requête sortante des en-têtes attendus par la passerelle du
 * groupe : identifiant de corrélation pour le suivi de bout en bout, et
 * périmètre de filiale.
 *
 * Le périmètre transmis ici est indicatif. Le backend ne doit jamais s'y fier
 * pour déterminer ce que l'utilisateur a le droit de consulter : il le déduit
 * du jeton d'authentification.
 */
export const correlationInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  return next(
    request.clone({
      setHeaders: {
        'X-Correlation-Id': crypto.randomUUID(),
        'X-Subsidiary-Context': auth.activeSubsidiaryId(),
        'Accept-Language': 'fr-FR',
      },
    }),
  );
};
