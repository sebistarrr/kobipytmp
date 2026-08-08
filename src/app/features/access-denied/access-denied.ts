import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { IconComponent } from '../../shared/ui/icon/icon';

@Component({
  selector: 'app-access-denied',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="denied">
      <span class="denied__glyph">
        <app-icon name="lock" [size]="26" [strokeWidth]="1.6" />
      </span>
      <h1 class="denied__title">Écran non accessible</h1>
      <p class="denied__text">
        Votre niveau d'habilitation ({{ auth.levelMeta().label }}) ne couvre pas cet écran. Si vous
        pensez qu'il s'agit d'une erreur, rapprochez-vous de votre responsable conformité.
      </p>
      <a class="btn btn--secondary" routerLink="/tableau-de-bord">
        <app-icon name="arrow-left" [size]="14" />
        Revenir au tableau de bord
      </a>
    </div>
  `,
  styles: `
    .denied {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      min-height: 60vh;
      padding: var(--sp-8);
      text-align: center;
    }

    .denied__glyph {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: var(--r-xl);
      background: var(--warning-soft);
      border: 1px solid var(--warning-border);
      color: var(--warning-text);
    }

    .denied__title {
      font-size: var(--fs-lg);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .denied__text {
      max-width: 52ch;
      font-size: var(--fs-sm);
      color: var(--text-tertiary);
      line-height: var(--lh-normal);
      margin-bottom: var(--sp-2);
    }
  `,
})
export class AccessDeniedComponent {
  protected readonly auth = inject(AuthService);
}
