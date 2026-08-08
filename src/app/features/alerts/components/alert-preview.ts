import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  SCREENING_TYPE_META,
  buildComparisonRows,
  COMPARISON_RESULT_META,
  type Alert,
  type ComparisonResult,
} from '../../../core/models';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { MatchScoreComponent } from '../../../shared/ui/match-score/match-score';
import { MatchBreakdownComponent } from '../../../shared/ui/match-score/match-breakdown';
import {
  DecisionBadgeComponent,
  RiskBadgeComponent,
  StatusBadgeComponent,
  TypeBadgeComponent,
} from '../../../shared/ui/badges/badges';
import { AgePipe, FrDatePipe, FrDateTimePipe, OrDashPipe } from '../../../shared/pipes/format.pipes';
import { formatComparisonValue } from '../../../shared/util/display';

/**
 * Aperçu d'une alerte, affiché dans le panneau latéral de la liste.
 *
 * Il répond aux trois questions qu'un analyste se pose avant d'ouvrir un
 * dossier : qui est le client, qui est la personne rapprochée, et sur quoi
 * porte la correspondance. Tout le reste est renvoyé à l'écran d'investigation.
 */
@Component({
  selector: 'app-alert-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    AvatarComponent,
    MatchScoreComponent,
    MatchBreakdownComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    RiskBadgeComponent,
    DecisionBadgeComponent,
    AgePipe,
    FrDatePipe,
    FrDateTimePipe,
    OrDashPipe,
  ],
  template: `
    <div class="pv">
      <!-- Score et qualification -->
      <section class="pv__hero">
        <app-match-score [score]="alert().match.score" size="md" />

        <div class="pv__hero-body">
          <div class="pv__badges">
            <app-type-badge [type]="alert().type" size="sm" />
            <app-risk-badge [priority]="alert().priority" size="sm" />
            <app-status-badge [status]="alert().status" size="sm" />
          </div>
          <p class="pv__type-desc">{{ typeMeta().description }}</p>
        </div>
      </section>

      @if (alert().resolution; as resolution) {
        <section class="pv__resolution">
          <div class="pv__resolution-head">
            <app-decision-badge [decision]="resolution.decision" size="sm" />
            <span class="pv__resolution-meta">
              {{ resolution.decidedByName }} · {{ resolution.decidedAt | frDateTime }}
            </span>
          </div>
          <p class="pv__resolution-comment">{{ resolution.comment }}</p>
        </section>
      }

      <!-- Confrontation des identités -->
      <section class="pv__section">
        <h3 class="pv__title eyebrow">Identités confrontées</h3>

        <div class="pv__parties">
          <article class="pv__party">
            <p class="pv__party-label">
              <app-icon name="user" [size]="12" />
              Client
            </p>
            <p class="pv__party-name">{{ alert().client.firstName }} {{ alert().client.lastName }}</p>
            <dl class="pv__facts">
              <div><dt>Né(e) le</dt><dd>{{ alert().client.birthDate | frDate }}</dd></div>
              <div><dt>Nationalité</dt><dd>{{ alert().client.nationality | orDash }}</dd></div>
              <div><dt>Résidence</dt><dd>{{ alert().client.residenceCountry | orDash }}</dd></div>
              <div><dt>Référence</dt><dd class="mono">{{ alert().client.reference }}</dd></div>
            </dl>
          </article>

          <article class="pv__party pv__party--profile">
            <p class="pv__party-label">
              <app-icon name="radar" [size]="12" />
              Fiche {{ alert().profile.provider }}
            </p>
            <p class="pv__party-name">
              {{ alert().profile.firstName }} {{ alert().profile.lastName }}
            </p>
            <dl class="pv__facts">
              <div>
                <dt>Né(e) le</dt>
                <dd>
                  {{ alert().profile.birthDate | frDate }}
                  @if (alert().profile.birthDateApproximate) {
                    <span class="pv__approx" title="Date approximative publiée par la source">~</span>
                  }
                </dd>
              </div>
              <div><dt>Nationalité</dt><dd>{{ alert().profile.nationality | orDash }}</dd></div>
              <div><dt>Pays</dt><dd>{{ alert().profile.countries.join(', ') | orDash }}</dd></div>
              <div><dt>Identifiant</dt><dd class="mono">{{ alert().profile.providerId }}</dd></div>
            </dl>
          </article>
        </div>
      </section>

      <!-- Divergences saillantes -->
      @if (divergences().length > 0) {
        <section class="pv__section">
          <h3 class="pv__title eyebrow">Points de divergence</h3>
          <ul class="pv__divergences">
            @for (row of divergences(); track row.attribute) {
              <li class="pv__divergence" [style.--tone]="'var(' + toneOf(row.result) + ')'">
                <span class="pv__divergence-label">{{ row.label }}</span>
                <span class="pv__divergence-values">
                  <span>{{ row.clientValue | orDash }}</span>
                  <app-icon name="arrow-right" [size]="11" />
                  <span>{{ row.profileValue | orDash }}</span>
                </span>
              </li>
            }
          </ul>
        </section>
      }

      <!-- Décomposition du score -->
      <section class="pv__section">
        <h3 class="pv__title eyebrow">Décomposition du score</h3>
        <app-match-breakdown [criteria]="alert().match.criteria" [showWeight]="false" />
      </section>

      <!-- Suivi -->
      <section class="pv__section">
        <h3 class="pv__title eyebrow">Suivi</h3>
        <dl class="pv__facts pv__facts--wide">
          <div>
            <dt>Générée</dt>
            <dd>{{ alert().generatedAt | frDateTime }} ({{ alert().generatedAt | age }})</dd>
          </div>
          <div><dt>Scénario</dt><dd>{{ alert().triggeredBy }}</dd></div>
          <div><dt>Lot</dt><dd class="mono">{{ alert().batchId }}</dd></div>
          <div>
            <dt>Affectation</dt>
            <dd>
              @if (alert().assignment; as assignment) {
                <span class="pv__assignee">
                  <app-avatar [name]="assignment.userName" [hue]="assignment.userHue" size="xs" />
                  {{ assignment.userName }}
                </span>
              } @else {
                <span class="pv__muted">Non affectée</span>
              }
            </dd>
          </div>
          <div><dt>Commentaires</dt><dd>{{ alert().commentCount }}</dd></div>
          @if (alert().reopenCount > 0) {
            <div>
              <dt>Réouvertures</dt>
              <dd class="pv__warn">{{ alert().reopenCount }}</dd>
            </div>
          }
        </dl>
      </section>

      <a class="btn btn--primary btn--block" [routerLink]="['/alertes', alert().id]">
        Ouvrir le dossier d'investigation
        <app-icon name="arrow-right" [size]="14" />
      </a>
    </div>
  `,
  styles: `
    .pv {
      display: flex;
      flex-direction: column;
      gap: var(--sp-5);
      padding: var(--sp-5);
    }

    .pv__hero {
      display: flex;
      align-items: center;
      gap: var(--sp-4);
      padding: var(--sp-4);
      border-radius: var(--r-lg);
      background: var(--bg-inset);
      border: 1px solid var(--border-subtle);
    }

    .pv__hero-body {
      min-width: 0;
    }

    .pv__badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-2);
      margin-bottom: var(--sp-2);
    }

    .pv__type-desc {
      font-size: var(--fs-xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .pv__resolution {
      padding: var(--sp-3);
      border-radius: var(--r-md);
      background: var(--bg-inset);
      border: 1px solid var(--border-subtle);
    }

    .pv__resolution-head {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex-wrap: wrap;
      margin-bottom: var(--sp-2);
    }

    .pv__resolution-meta {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
    }

    .pv__resolution-comment {
      font-size: var(--fs-xs);
      color: var(--text-secondary);
      line-height: var(--lh-normal);
    }

    .pv__title {
      margin-bottom: var(--sp-3);
    }

    .pv__parties {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-2);
    }

    .pv__party {
      padding: var(--sp-3);
      border-radius: var(--r-md);
      border: 1px solid var(--border-subtle);
      background: var(--bg-inset);
      min-width: 0;
    }

    .pv__party--profile {
      border-color: var(--sanction-border);
      background: color-mix(in srgb, var(--sanction) 5%, var(--bg-inset));
    }

    .pv__party-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
      margin-bottom: var(--sp-2);
    }

    .pv__party-name {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      margin-bottom: var(--sp-3);
      line-height: var(--lh-snug);
    }

    .pv__facts {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
    }

    .pv__facts > div {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .pv__facts--wide > div {
      flex-direction: row;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--sp-3);
      padding: var(--sp-2) 0;
      border-bottom: 1px solid var(--border-subtle);
    }

    .pv__facts--wide > div:last-child {
      border-bottom: none;
    }

    .pv__facts dt {
      font-size: 10px;
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
      flex: none;
    }

    .pv__facts dd {
      font-size: var(--fs-xs);
      color: var(--text-primary);
      overflow-wrap: anywhere;
    }

    .pv__facts--wide dd {
      text-align: right;
    }

    .pv__approx {
      color: var(--warning-text);
      font-weight: var(--fw-semibold);
      margin-left: 2px;
    }

    .pv__divergences {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
    }

    .pv__divergence {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--r-sm);
      border-left: 2px solid var(--tone);
      background: var(--bg-inset);
    }

    .pv__divergence-label {
      font-size: 10px;
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .pv__divergence-values {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      font-size: var(--fs-xs);
      color: var(--text-primary);
      flex-wrap: wrap;
    }

    .pv__divergence-values app-icon {
      color: var(--text-disabled);
    }

    .pv__assignee {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .pv__muted {
      color: var(--text-disabled);
      font-style: italic;
    }

    .pv__warn {
      color: var(--warning-text);
      font-weight: var(--fw-semibold);
    }

    @media (max-width: 520px) {
      .pv__parties {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class AlertPreviewComponent {
  readonly alert = input.required<Alert>();

  protected readonly typeMeta = computed(() => SCREENING_TYPE_META[this.alert().type]);

  /** Seuls les écarts sont remontés : les correspondances n'apprennent rien ici. */
  protected readonly divergences = computed(() => {
    const alert = this.alert();
    return buildComparisonRows(alert.client, alert.profile, alert.match.criteria)
      .filter(
        (row) =>
          row.result === 'DIVERGENCE' || row.result === 'UNCERTAIN' || row.result === 'MISSING',
      )
      .map((row) => ({
        ...row,
        clientValue: formatComparisonValue(row.attribute, row.clientValue),
        profileValue: formatComparisonValue(row.attribute, row.profileValue),
      }));
  });

  protected toneOf(result: ComparisonResult): string {
    return COMPARISON_RESULT_META[result].colorVar;
  }
}
