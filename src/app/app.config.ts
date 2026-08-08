import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { correlationInterceptor } from './core/interceptors/correlation.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    /* Détection de changement pilotée par les signaux : aucune dépendance à Zone.js. */
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      /* Les paramètres de route arrivent directement dans les `input()` des composants. */
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([correlationInterceptor])),
  ],
};
