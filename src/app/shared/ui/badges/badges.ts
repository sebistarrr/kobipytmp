import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  ALERT_STATUS_META,
  DECISION_META,
  PRIORITY_META,
  SCREENING_TYPE_META,
  USER_LEVEL_META,
  type AlertStatus,
  type Decision,
  type Priority,
  type ScreeningType,
  type UserLevel,
} from '../../../core/models';
import { IconComponent } from '../icon/icon';

export type BadgeSize = 'sm' | 'md' | 'lg';

/* -----------------------------------------------------------------------------
   Socle commun : toutes les pastilles métier s'appuient dessus.
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="classes()" [attr.title]="tooltip() || null">
      @if (showDot()) {
        <span class="dot"></span>
      }
      <ng-content />
      <span>{{ label() }}</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      min-width: 0;
    }
  `,
})
export class BadgeComponent {
  readonly label = input.required<string>();
  readonly variant = input<string>('neutral');
  readonly size = input<BadgeSize>('md');
  readonly showDot = input(false);
  readonly tooltip = input<string>('');
  readonly pulse = input(false);

  protected readonly classes = computed(() => {
    const classes = [`badge--${this.variant()}`];
    if (this.size() !== 'md') classes.push(`badge--${this.size()}`);
    if (this.pulse()) classes.push('badge--pulse');
    return classes.join(' ');
  });
}

/* -----------------------------------------------------------------------------
   Statut de l'alerte dans le workflow
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    <app-badge
      [label]="meta().label"
      [variant]="meta().variant"
      [size]="size()"
      [showDot]="true"
      [pulse]="status() === 'REOPENED'"
      [tooltip]="meta().description"
    />
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<AlertStatus>();
  readonly size = input<BadgeSize>('md');
  protected readonly meta = computed(() => ALERT_STATUS_META[this.status()]);
}

/* -----------------------------------------------------------------------------
   Dispositif de screening — sanction, PEP, RCA
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    <app-badge
      [label]="meta().label"
      [variant]="meta().variant"
      [size]="size()"
      [tooltip]="meta().fullLabel + ' — ' + meta().description"
    />
  `,
})
export class TypeBadgeComponent {
  readonly type = input.required<ScreeningType>();
  readonly size = input<BadgeSize>('md');
  protected readonly meta = computed(() => SCREENING_TYPE_META[this.type()]);
}

/* -----------------------------------------------------------------------------
   Priorité / niveau de risque
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-risk-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, IconComponent],
  template: `
    <app-badge
      [label]="meta().label"
      [variant]="meta().variant"
      [size]="size()"
      [tooltip]="'Délai de traitement attendu : ' + meta().slaHours + ' h'"
    >
      @if (priority() === 'CRITICAL') {
        <app-icon name="alert-triangle" [size]="11" />
      }
    </app-badge>
  `,
})
export class RiskBadgeComponent {
  readonly priority = input.required<Priority>();
  readonly size = input<BadgeSize>('md');
  protected readonly meta = computed(() => PRIORITY_META[this.priority()]);
}

/* -----------------------------------------------------------------------------
   Décision prononcée
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-decision-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, IconComponent],
  template: `
    <app-badge
      [label]="meta().label"
      [variant]="meta().variant"
      [size]="size()"
      [tooltip]="meta().description"
    >
      <app-icon [name]="decision() === 'CONFIRMED' ? 'alert-triangle' : 'check'" [size]="11" />
    </app-badge>
  `,
})
export class DecisionBadgeComponent {
  readonly decision = input.required<Decision>();
  readonly size = input<BadgeSize>('md');
  protected readonly meta = computed(() => DECISION_META[this.decision()]);
}

/* -----------------------------------------------------------------------------
   Niveau d'habilitation
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-level-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    <app-badge
      [label]="meta().shortLabel"
      [variant]="meta().variant"
      [size]="size()"
      [tooltip]="meta().description"
    />
  `,
})
export class LevelBadgeComponent {
  readonly level = input.required<UserLevel>();
  readonly size = input<BadgeSize>('sm');
  protected readonly meta = computed(() => USER_LEVEL_META[this.level()]);
}
