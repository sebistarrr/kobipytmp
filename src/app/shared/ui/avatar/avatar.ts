import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Pastille d'identité. La teinte est portée par la donnée utilisateur, ce qui
 * la rend stable dans le temps : un analyste conserve la même couleur d'un
 * écran à l'autre, ce qui aide à le reconnaître dans les listes denses.
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="avatar" [style.--hue]="hue()" [attr.title]="name()" [attr.aria-label]="name()">
      {{ initials() }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    .avatar {
      --size: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--size);
      height: var(--size);
      border-radius: var(--r-full);
      background: hsl(var(--hue) 55% 50% / 0.16);
      border: 1px solid hsl(var(--hue) 55% 60% / 0.3);
      color: hsl(var(--hue) 62% 72%);
      font-size: calc(var(--size) * 0.36);
      font-weight: var(--fw-semibold);
      letter-spacing: 0.01em;
      line-height: 1;
      user-select: none;
    }

    :host-context([data-theme='light']) .avatar {
      background: hsl(var(--hue) 60% 45% / 0.1);
      border-color: hsl(var(--hue) 50% 45% / 0.26);
      color: hsl(var(--hue) 55% 34%);
    }

    :host([data-size='xs']) .avatar {
      --size: 20px;
    }
    :host([data-size='sm']) .avatar {
      --size: 24px;
    }
    :host([data-size='lg']) .avatar {
      --size: 36px;
    }
    :host([data-size='xl']) .avatar {
      --size: 44px;
    }
  `,
  host: { '[attr.data-size]': 'size()' },
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly hue = input(232);
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  });
}
