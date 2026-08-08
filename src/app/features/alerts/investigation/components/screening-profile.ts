import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { formatAddress, type ScreeningProfile } from '../../../../core/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { BadgeComponent } from '../../../../shared/ui/badges/badges';
import { FrDatePipe, OrDashPipe, RelativeTimePipe } from '../../../../shared/pipes/format.pipes';

/**
 * Colonne « fiche de screening » : ce que le fournisseur publie sur la
 * personne listée.
 *
 * Les inscriptions de sanctions et le statut PEP sont remontés en tête : ce
 * sont eux qui déterminent la gravité de l'alerte, avant même la question de
 * savoir si la correspondance est bonne.
 */
@Component({
  selector: 'app-screening-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, BadgeComponent, FrDatePipe, OrDashPipe, RelativeTimePipe],
  template: `
    <section class="panel sp">
      <header class="panel__head">
        <h2 class="panel__title">
          <span class="sp__badge"><app-icon name="radar" [size]="13" /></span>
          Fiche {{ profile().provider }}
        </h2>
        <span class="sp__updated" [title]="'Dernière mise à jour de la fiche fournisseur'">
          <app-icon name="refresh" [size]="12" />
          {{ profile().lastUpdatedAt | relativeTime }}
        </span>
      </header>

      <div class="panel__body sp__body">
        <div class="sp__identity">
          <p class="sp__name">{{ profile().firstName }} {{ profile().lastName }}</p>
          <p class="sp__reference mono">{{ profile().providerId }}</p>

          <div class="sp__flags">
            @if (profile().sanctions.length > 0) {
              <app-badge label="Sanctionné" variant="sanction" size="sm" />
            }
            @if (profile().isPep) {
              <app-badge label="PEP" variant="pep" size="sm" />
            }
            @if (profile().relatedParties.length > 0) {
              <app-badge label="Liens identifiés" variant="rca" size="sm" />
            }
            @if (profile().deceased) {
              <app-badge label="Décédé" variant="neutral" size="sm" />
            }
          </div>
        </div>

        <p class="sp__summary">{{ profile().summary }}</p>

        <!-- Inscriptions de sanctions -->
        @if (profile().sanctions.length > 0) {
          <div class="sp__block sp__block--sanction">
            <p class="meta-label">Inscriptions</p>
            @for (listing of profile().sanctions; track listing.reference) {
              <article class="sp__listing">
                <div class="sp__listing-head">
                  <span class="sp__listing-authority">{{ listing.authority }}</span>
                  @if (listing.active) {
                    <app-badge label="Active" variant="critical" size="sm" />
                  } @else {
                    <app-badge label="Levée" variant="neutral" size="sm" />
                  }
                </div>
                <p class="sp__listing-programme">{{ listing.programme }}</p>
                <dl class="sp__listing-facts">
                  <div><dt>Inscrit le</dt><dd>{{ listing.listedOn | frDate }}</dd></div>
                  <div><dt>Référence</dt><dd class="mono">{{ listing.reference }}</dd></div>
                  <div><dt>Mesures</dt><dd>{{ listing.measures }}</dd></div>
                </dl>
              </article>
            }
          </div>
        }

        <!-- Statut PEP -->
        @if (profile().isPep) {
          <div class="sp__block sp__block--pep">
            <p class="meta-label">Exposition politique</p>
            <p class="sp__pep-category">{{ profile().pepCategory | orDash }}</p>
          </div>
        }

        <!-- Identité publiée -->
        <dl class="sp__facts">
          <div class="sp__fact">
            <dt>Date de naissance</dt>
            <dd>
              {{ profile().birthDate | frDate }}
              @if (profile().birthDateApproximate) {
                <span class="sp__approx" title="La source ne publie qu'une date approximative">
                  approx.
                </span>
              }
            </dd>
          </div>
          <div class="sp__fact">
            <dt>Lieu de naissance</dt>
            <dd>{{ profile().birthPlace | orDash }}</dd>
          </div>
          <div class="sp__fact">
            <dt>Nationalité</dt>
            <dd>{{ profile().nationality | orDash }}</dd>
          </div>
          <div class="sp__fact">
            <dt>Pays de rattachement</dt>
            <dd>{{ countries() }}</dd>
          </div>
          <div class="sp__fact">
            <dt>Adresse</dt>
            <dd>{{ address() }}</dd>
          </div>
          <div class="sp__fact">
            <dt>Sexe</dt>
            <dd>{{ profile().gender }}</dd>
          </div>
        </dl>

        <!-- Sections repliables : le détail ne s'impose pas d'emblée -->
        @if (profile().positions.length > 0) {
          <details class="sp__details" [open]="expanded()">
            <summary class="sp__summary-row">
              <app-icon name="briefcase" [size]="13" />
              Fonctions et mandats
              <span class="count-pill">{{ profile().positions.length }}</span>
              <app-icon class="sp__caret" name="chevron-down" [size]="14" />
            </summary>
            <ul class="sp__positions">
              @for (position of profile().positions; track position.title + position.from) {
                <li class="sp__position">
                  <span class="sp__position-title">{{ position.title }}</span>
                  <span class="sp__position-org">{{ position.organisation }} · {{ position.country }}</span>
                  <span class="sp__position-dates">
                    {{ position.from | frDate }} —
                    {{ position.to ? (position.to | frDate) : 'en cours' }}
                  </span>
                </li>
              }
            </ul>
          </details>
        }

        @if (profile().relatedParties.length > 0) {
          <details class="sp__details">
            <summary class="sp__summary-row">
              <app-icon name="users" [size]="13" />
              Personnes et entités liées
              <span class="count-pill">{{ profile().relatedParties.length }}</span>
              <app-icon class="sp__caret" name="chevron-down" [size]="14" />
            </summary>
            <ul class="sp__related">
              @for (party of profile().relatedParties; track party.name) {
                <li class="sp__party">
                  <span class="sp__party-name">{{ party.name }}</span>
                  <span class="sp__party-rel">{{ party.relationship }}</span>
                  <app-badge [label]="party.nature" variant="neutral" size="sm" />
                </li>
              }
            </ul>
          </details>
        }

        <details class="sp__details">
          <summary class="sp__summary-row">
            <app-icon name="file-text" [size]="13" />
            Sources
            <span class="count-pill">{{ profile().sources.length }}</span>
            <app-icon class="sp__caret" name="chevron-down" [size]="14" />
          </summary>
          <ul class="sp__sources">
            @for (source of profile().sources; track source.name + source.publishedAt) {
              <li class="sp__source">
                <span class="sp__source-name">{{ source.name }}</span>
                <span class="sp__source-meta">{{ source.kind }} · {{ source.publishedAt | frDate }}</span>
              </li>
            }
          </ul>
        </details>

        <button type="button" class="btn btn--secondary btn--sm btn--block">
          <app-icon name="external" [size]="13" />
          Consulter la fiche complète chez {{ profile().provider }}
        </button>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .sp {
      height: 100%;
      border-color: var(--sanction-border);
    }

    .sp__badge {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: var(--r-sm);
      background: var(--sanction-soft);
      color: var(--sanction-text);
    }

    .sp__updated {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .sp__body {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }

    .sp__name {
      font-size: var(--fs-lg);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-tighter);
      color: var(--text-primary);
      line-height: var(--lh-tight);
    }

    .sp__reference {
      margin-top: 3px;
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
    }

    .sp__flags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-1);
      margin-top: var(--sp-3);
    }

    .sp__summary {
      font-size: var(--fs-xs);
      color: var(--text-secondary);
      line-height: var(--lh-normal);
      padding: var(--sp-3);
      border-radius: var(--r-md);
      background: var(--bg-inset);
      border: 1px solid var(--border-subtle);
    }

    .sp__block {
      padding: var(--sp-3);
      border-radius: var(--r-md);
      border: 1px solid var(--border-subtle);
    }

    .sp__block--sanction {
      border-color: var(--sanction-border);
      background: color-mix(in srgb, var(--sanction) 6%, transparent);
    }

    .sp__block--pep {
      border-color: var(--pep-border);
      background: color-mix(in srgb, var(--pep) 6%, transparent);
    }

    .sp__pep-category {
      margin-top: var(--sp-2);
      font-size: var(--fs-xs);
      color: var(--text-primary);
    }

    .sp__listing {
      margin-top: var(--sp-3);
      padding-top: var(--sp-3);
      border-top: 1px solid var(--border-subtle);
    }

    .sp__listing:first-of-type {
      margin-top: var(--sp-2);
      padding-top: 0;
      border-top: none;
    }

    .sp__listing-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
      margin-bottom: var(--sp-1);
    }

    .sp__listing-authority {
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .sp__listing-programme {
      font-size: var(--fs-xs);
      color: var(--text-secondary);
      line-height: var(--lh-snug);
      margin-bottom: var(--sp-2);
    }

    .sp__listing-facts {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .sp__listing-facts > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--sp-3);
    }

    .sp__listing-facts dt {
      font-size: 10px;
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
      flex: none;
    }

    .sp__listing-facts dd {
      font-size: var(--fs-2xs);
      color: var(--text-primary);
      text-align: right;
    }

    .sp__facts {
      display: flex;
      flex-direction: column;
    }

    .sp__fact {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--sp-4);
      padding: var(--sp-2) 0;
      border-bottom: 1px solid var(--border-subtle);
    }

    .sp__fact:last-child {
      border-bottom: none;
    }

    .sp__fact dt {
      font-size: var(--fs-2xs);
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
      flex: none;
    }

    .sp__fact dd {
      font-size: var(--fs-xs);
      color: var(--text-primary);
      text-align: right;
      overflow-wrap: anywhere;
    }

    .sp__approx {
      display: inline-block;
      margin-left: 4px;
      padding: 1px 5px;
      border-radius: var(--r-xs);
      background: var(--warning-soft);
      color: var(--warning-text);
      font-size: 10px;
      font-weight: var(--fw-medium);
    }

    /* --- Sections repliables --- */
    .sp__details {
      border-top: 1px solid var(--border-subtle);
      padding-top: var(--sp-3);
    }

    .sp__summary-row {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      cursor: pointer;
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-secondary);
      list-style: none;
      user-select: none;
    }

    .sp__summary-row::-webkit-details-marker {
      display: none;
    }

    .sp__summary-row:hover {
      color: var(--text-primary);
    }

    .sp__caret {
      margin-left: auto;
      color: var(--text-tertiary);
      transition: transform var(--dur-base) var(--ease-out);
    }

    .sp__details[open] .sp__caret {
      transform: rotate(180deg);
    }

    .sp__positions,
    .sp__related,
    .sp__sources {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      margin-top: var(--sp-3);
    }

    .sp__position,
    .sp__source {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: var(--sp-2);
      border-radius: var(--r-sm);
      background: var(--bg-inset);
    }

    .sp__position-title,
    .sp__party-name,
    .sp__source-name {
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-primary);
    }

    .sp__position-org,
    .sp__position-dates,
    .sp__party-rel,
    .sp__source-meta {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }

    .sp__party {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex-wrap: wrap;
      padding: var(--sp-2);
      border-radius: var(--r-sm);
      background: var(--bg-inset);
    }

    .sp__party-rel {
      flex: 1;
      min-width: 120px;
    }
  `,
})
export class ScreeningProfileComponent {
  readonly profile = input.required<ScreeningProfile>();

  /** Les fonctions sont dépliées par défaut : c'est la section la plus consultée. */
  protected readonly expanded = signal(true);

  protected readonly address = computed(() => formatAddress(this.profile().address));
  protected readonly countries = computed(() => this.profile().countries.join(', ') || '—');
}
