import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { AUDIT_ACTION_META, type AuditAction, type AuditEvent } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar';
import { IconComponent, type IconName } from '../../../../shared/ui/icon/icon';
import { FrDatePipe, FrTimePipe, RelativeTimePipe } from '../../../../shared/pipes/format.pipes';

const ACTION_ICONS: Record<AuditAction, IconName> = {
  ALERT_GENERATED: 'radar',
  ALERT_VIEWED: 'eye',
  ALERT_ASSIGNED: 'user-check',
  ALERT_UNASSIGNED: 'user-minus',
  STATUS_CHANGED: 'arrow-right',
  COMMENT_ADDED: 'message',
  ALIAS_SELECTED: 'target',
  DECISION_TAKEN: 'gavel',
  ESCALATED: 'arrow-up',
  ALERT_REOPENED: 'rotate',
  PROFILE_REFRESHED: 'refresh',
};

/**
 * Historique d'audit.
 *
 * Traité comme un registre en écriture seule : aucune action de l'interface ne
 * permet de modifier ou de retirer une entrée. Chaque événement porte son
 * identifiant, son auteur, son horodatage et, le cas échéant, la valeur avant
 * et après — de quoi reconstituer la vie du dossier devant un contrôleur.
 */
@Component({
  selector: 'app-audit-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent, FrDatePipe, FrTimePipe, RelativeTimePipe],
  template: `
    <div class="tl">
      @for (group of grouped(); track group.day) {
        <div class="tl__day">
          <span class="tl__day-label">{{ group.day | frDate }}</span>
          <span class="tl__day-line"></span>
        </div>

        @for (event of group.events; track event.id) {
          <article class="tl__event" [attr.data-variant]="variantOf(event.action)">
            <div class="tl__rail">
              <span class="tl__marker">
                <app-icon [name]="iconOf(event.action)" [size]="12" [strokeWidth]="2" />
              </span>
            </div>

            <div class="tl__body">
              <header class="tl__head">
                <span class="tl__action">{{ labelOf(event.action) }}</span>
                <span class="tl__time" [title]="event.timestamp | relativeTime">
                  {{ event.timestamp | frTime }}
                </span>
              </header>

              <div class="tl__actor">
                @if (event.actorId) {
                  <app-avatar [name]="event.actorName" [hue]="hueFor(event.actorName)" size="xs" />
                } @else {
                  <span class="tl__system">
                    <app-icon name="zap" [size]="11" />
                  </span>
                }
                <span class="tl__actor-name">{{ event.actorName }}</span>
                <span class="tl__actor-role">{{ event.actorRole }}</span>
              </div>

              @if (event.previousValue || event.newValue) {
                <div class="tl__transition">
                  @if (event.previousValue) {
                    <span class="tl__from">{{ event.previousValue }}</span>
                    <app-icon name="arrow-right" [size]="11" />
                  }
                  <span class="tl__to">{{ event.newValue }}</span>
                </div>
              }

              @if (event.comment) {
                <p class="tl__comment">{{ event.comment }}</p>
              }

              @if (expandedId() === event.id) {
                <dl class="tl__forensics anim-fade-in">
                  <div><dt>Identifiant</dt><dd class="mono">{{ event.id }}</dd></div>
                  <div><dt>Horodatage</dt><dd class="mono">{{ event.timestamp }}</dd></div>
                  <div><dt>Origine</dt><dd class="mono">{{ event.sourceIp }}</dd></div>
                </dl>
              }

              <button type="button" class="tl__toggle" (click)="toggle(event.id)">
                {{ expandedId() === event.id ? 'Masquer' : 'Détail technique' }}
              </button>
            </div>
          </article>
        }
      } @empty {
        <p class="tl__empty">Aucun événement enregistré pour ce dossier.</p>
      }

      <p class="tl__seal">
        <app-icon name="lock" [size]="12" />
        Registre en écriture seule. Les entrées ne peuvent être ni modifiées ni supprimées depuis
        l'application.
      </p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .tl {
      display: flex;
      flex-direction: column;
    }

    /* --- Séparateur de journée --- */
    .tl__day {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-3) 0 var(--sp-2);
    }

    .tl__day-label {
      font-size: var(--fs-2xs);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
      flex: none;
    }

    .tl__day-line {
      flex: 1;
      height: 1px;
      background: var(--border-subtle);
    }

    /* --- Événement --- */
    .tl__event {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr);
      gap: var(--sp-3);
      --tone: var(--neutral);
    }

    .tl__event[data-variant='critical'] {
      --tone: var(--critical);
    }
    .tl__event[data-variant='success'] {
      --tone: var(--success);
    }
    .tl__event[data-variant='info'] {
      --tone: var(--info);
    }
    .tl__event[data-variant='accent'] {
      --tone: var(--accent);
    }
    .tl__event[data-variant='sanction'] {
      --tone: var(--sanction);
    }

    .tl__rail {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .tl__marker {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      flex: none;
      border-radius: var(--r-full);
      border: 1px solid color-mix(in srgb, var(--tone) 30%, transparent);
      background: color-mix(in srgb, var(--tone) 12%, var(--bg-surface));
      color: var(--tone);
    }

    /* Trait vertical reliant les événements successifs. */
    .tl__rail::after {
      content: '';
      flex: 1;
      width: 1px;
      background: var(--border-subtle);
      min-height: 8px;
    }

    .tl__event:last-of-type .tl__rail::after {
      display: none;
    }

    .tl__body {
      padding-bottom: var(--sp-4);
      min-width: 0;
    }

    .tl__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--sp-3);
    }

    .tl__action {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }

    .tl__time {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      font-variant-numeric: tabular-nums;
      flex: none;
    }

    .tl__actor {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      margin-top: var(--sp-2);
      flex-wrap: wrap;
    }

    .tl__system {
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      border-radius: var(--r-full);
      background: var(--bg-active);
      color: var(--text-tertiary);
    }

    .tl__actor-name {
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-secondary);
    }

    .tl__actor-role {
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      padding: 1px 6px;
      border-radius: var(--r-full);
      background: var(--bg-active);
    }

    .tl__transition {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      flex-wrap: wrap;
      margin-top: var(--sp-2);
      font-size: var(--fs-xs);
    }

    .tl__from {
      color: var(--text-tertiary);
      text-decoration: line-through;
      text-decoration-color: var(--text-disabled);
    }

    .tl__transition app-icon {
      color: var(--text-disabled);
    }

    .tl__to {
      color: var(--tone);
      font-weight: var(--fw-medium);
    }

    .tl__comment {
      margin-top: var(--sp-2);
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--r-sm);
      border-left: 2px solid var(--border-default);
      background: var(--bg-inset);
      font-size: var(--fs-xs);
      color: var(--text-secondary);
      line-height: var(--lh-normal);
    }

    .tl__forensics {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: var(--sp-2);
      padding: var(--sp-2) var(--sp-3);
      border-radius: var(--r-sm);
      background: var(--bg-inset);
      border: 1px solid var(--border-subtle);
    }

    .tl__forensics > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--sp-3);
    }

    .tl__forensics dt {
      font-size: 10px;
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-tertiary);
    }

    .tl__forensics dd {
      font-size: 10px;
      color: var(--text-secondary);
      overflow-wrap: anywhere;
      text-align: right;
    }

    .tl__toggle {
      margin-top: var(--sp-2);
      font-size: 10px;
      letter-spacing: var(--ls-wide);
      text-transform: uppercase;
      color: var(--text-disabled);
      transition: color var(--dur-fast) var(--ease-out);
    }

    .tl__toggle:hover {
      color: var(--text-secondary);
    }

    .tl__empty {
      padding: var(--sp-6) 0;
      text-align: center;
      font-size: var(--fs-sm);
      color: var(--text-tertiary);
    }

    .tl__seal {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-2);
      margin-top: var(--sp-3);
      padding-top: var(--sp-3);
      border-top: 1px solid var(--border-subtle);
      font-size: var(--fs-2xs);
      color: var(--text-tertiary);
      line-height: var(--lh-snug);
    }

    .tl__seal app-icon {
      margin-top: 1px;
    }
  `,
})
export class AuditTimelineComponent {
  readonly events = input.required<readonly AuditEvent[]>();

  protected readonly expandedId = signal<string | null>(null);

  /** Regroupement par journée : l'échelle de lecture naturelle d'un dossier. */
  protected readonly grouped = computed(() => {
    const groups = new Map<string, AuditEvent[]>();

    for (const event of this.events()) {
      const day = event.timestamp.slice(0, 10);
      const bucket = groups.get(day);
      if (bucket) bucket.push(event);
      else groups.set(day, [event]);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([day, events]) => ({ day, events }));
  });

  protected toggle(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  protected labelOf(action: AuditAction): string {
    return AUDIT_ACTION_META[action].label;
  }

  protected variantOf(action: AuditAction): string {
    return AUDIT_ACTION_META[action].variant;
  }

  protected iconOf(action: AuditAction): IconName {
    return ACTION_ICONS[action];
  }

  /** Teinte d'avatar dérivée du nom : stable sans dépendre du référentiel. */
  protected hueFor(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
    return hash;
  }
}
