import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatAddress, type Client } from '../../../../core/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EurPipe, FrDatePipe, OrDashPipe } from '../../../../shared/pipes/format.pipes';

/**
 * Colonne « client » : ce que la filiale sait de son client.
 *
 * Les attributs qui participent au rapprochement sont marqués d'un point
 * discret, afin que l'analyste distingue d'un coup d'œil les données
 * confrontées de celles qui ne servent qu'au contexte.
 */
@Component({
  selector: 'app-client-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, FrDatePipe, EurPipe, OrDashPipe],
  template: `
    <section class="panel cp">
      <header class="panel__head">
        <h2 class="panel__title">
          <span class="cp__badge"><app-icon name="user" [size]="13" /></span>
          Client
        </h2>
        <span class="cp__risk" [attr.data-level]="client().riskRating">
          Risque {{ client().riskRating.toLowerCase() }}
        </span>
      </header>

      <div class="panel__body cp__body">
        <div class="cp__identity">
          <p class="cp__name">{{ client().firstName }} {{ client().lastName }}</p>
          <p class="cp__reference mono">{{ client().reference }}</p>
        </div>

        <dl class="cp__facts">
          <div class="cp__fact" data-matched>
            <dt>Nom</dt>
            <dd>{{ client().lastName }}</dd>
          </div>
          <div class="cp__fact" data-matched>
            <dt>Prénom</dt>
            <dd>{{ client().firstName }}</dd>
          </div>
          <div class="cp__fact" data-matched>
            <dt>Date de naissance</dt>
            <dd>{{ client().birthDate | frDate }}</dd>
          </div>
          <div class="cp__fact" data-matched>
            <dt>Lieu de naissance</dt>
            <dd>{{ client().birthPlace | orDash }}</dd>
          </div>
          <div class="cp__fact" data-matched>
            <dt>Nationalité</dt>
            <dd>{{ client().nationality | orDash }}</dd>
          </div>
          <div class="cp__fact" data-matched>
            <dt>Pays de résidence</dt>
            <dd>{{ client().residenceCountry | orDash }}</dd>
          </div>
          <div class="cp__fact" data-matched>
            <dt>Adresse</dt>
            <dd>{{ address() }}</dd>
          </div>
          <div class="cp__fact">
            <dt>Pièce d'identité</dt>
            <dd>{{ client().identityDocument | orDash }}</dd>
          </div>
        </dl>

        <div class="cp__divider"></div>

        <dl class="cp__facts">
          <div class="cp__fact">
            <dt>Entrée en relation</dt>
            <dd>{{ client().relationshipStartDate | frDate }}</dd>
          </div>
          <div class="cp__fact">
            <dt>Segment</dt>
            <dd>{{ client().clientSegment }}</dd>
          </div>
          <div class="cp__fact" data-matched>
            <dt>Profession</dt>
            <dd>{{ client().occupation | orDash }}</dd>
          </div>
          <div class="cp__fact">
            <dt>Société</dt>
            <dd>{{ client().employer | orDash }}</dd>
          </div>
          <div class="cp__fact">
            <dt>Flux annuel</dt>
            <dd>{{ client().annualFlowEur | eur }}</dd>
          </div>
        </dl>

        @if (client().aliases.length > 0) {
          <div class="cp__divider"></div>
          <div class="cp__aliases">
            <p class="meta-label">Alias connus du client</p>
            <ul>
              @for (alias of client().aliases; track alias) {
                <li class="cp__alias">{{ alias }}</li>
              }
            </ul>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .cp {
      height: 100%;
    }

    .cp__badge {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: var(--r-sm);
      background: var(--info-soft);
      color: var(--info-text);
    }

    .cp__risk {
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: var(--r-full);
      background: var(--neutral-soft);
      color: var(--neutral-text);
      white-space: nowrap;
    }

    .cp__risk[data-level='ÉLEVÉ'] {
      background: var(--critical-soft);
      color: var(--critical-text);
    }

    .cp__risk[data-level='MODÉRÉ'] {
      background: var(--warning-soft);
      color: var(--warning-text);
    }

    .cp__body {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }

    .cp__identity {
      padding-bottom: var(--sp-1);
    }

    .cp__name {
      font-size: var(--fs-lg);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tighter);
      color: var(--text-primary);
      line-height: var(--lh-tight);
    }

    .cp__reference {
      margin-top: 3px;
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
    }

    .cp__facts {
      display: flex;
      flex-direction: column;
    }

    .cp__fact {
      position: relative;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--sp-4);
      padding: var(--sp-2) 0;
      border-bottom: 1px solid var(--border-subtle);
    }

    .cp__fact:last-child {
      border-bottom: none;
    }

    /* Point marquant les attributs entrant dans le calcul du score. */
    .cp__fact[data-matched]::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 3px;
      border-radius: var(--r-full);
      background: var(--accent);
      opacity: 0.6;
    }

    .cp__fact dt {
      font-size: var(--fs-2xs);
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
      flex: none;
    }

    .cp__fact dd {
      font-size: var(--fs-xs);
      color: var(--text-primary);
      text-align: right;
      overflow-wrap: anywhere;
    }

    .cp__divider {
      height: 1px;
      background: var(--border-subtle);
    }

    .cp__aliases ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-1);
      margin-top: var(--sp-2);
    }

    .cp__alias {
      padding: 3px 8px;
      border-radius: var(--r-full);
      border: 1px solid var(--border-default);
      background: var(--bg-inset);
      font-size: var(--fs-xs);
      color: var(--text-secondary);
    }
  `,
})
export class ClientProfileComponent {
  readonly client = input.required<Client>();
  protected readonly address = computed(() => formatAddress(this.client().address));
}
