import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * Jeu d'icônes de l'application.
 *
 * Le tracé est vectoriel, au trait, sur une grille de 24 pixels. Les icônes
 * sont embarquées plutôt que chargées depuis une bibliothèque externe : cela
 * garantit un poids nul au chargement et un rendu identique dans les deux
 * thèmes, la couleur étant toujours héritée du texte environnant.
 */
export type IconName =
  | 'dashboard'
  | 'inbox'
  | 'user-check'
  | 'archive'
  | 'chart'
  | 'settings'
  | 'search'
  | 'bell'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'check-circle'
  | 'x'
  | 'x-circle'
  | 'minus'
  | 'minus-circle'
  | 'approx'
  | 'question'
  | 'alert-triangle'
  | 'shield'
  | 'shield-check'
  | 'sun'
  | 'moon'
  | 'plus'
  | 'filter'
  | 'sort'
  | 'more'
  | 'external'
  | 'clock'
  | 'calendar'
  | 'user'
  | 'users'
  | 'user-minus'
  | 'message'
  | 'gavel'
  | 'rotate'
  | 'refresh'
  | 'radar'
  | 'eye'
  | 'arrow-up'
  | 'arrow-right'
  | 'arrow-down'
  | 'arrow-left'
  | 'target'
  | 'download'
  | 'panel-left'
  | 'lock'
  | 'info'
  | 'activity'
  | 'flag'
  | 'building'
  | 'globe'
  | 'file-text'
  | 'link'
  | 'trending-up'
  | 'trending-down'
  | 'command'
  | 'logout'
  | 'briefcase'
  | 'map-pin'
  | 'id-card'
  | 'scale'
  | 'zap'
  | 'layers';

/** Tracés SVG, exprimés dans un viewBox 24×24. */
const PATHS: Record<IconName, string> = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  inbox: '<path d="M4 13h4l1.5 3h5L16 13h4"/><path d="M4.5 13 6 5.2A2 2 0 0 1 8 3.6h8a2 2 0 0 1 2 1.6L19.5 13v4.4a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/>',
  'user-check': '<path d="M15 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20"/><circle cx="9" cy="8" r="3.4"/><path d="m16.5 11.5 2 2 4-4"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1.5"/><path d="M5 8v10.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V8"/><path d="M10 12h4"/>',
  chart: '<path d="M3 3v16.5A1.5 1.5 0 0 0 4.5 21H21"/><path d="m7 15 3.5-4 3 2.5L19 7"/>',
  settings: '<circle cx="12" cy="12" r="2.8"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.9-3.9"/>',
  bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  minus: '<path d="M5 12h14"/>',
  'minus-circle': '<circle cx="12" cy="12" r="9"/><path d="M8.5 12h7"/>',
  approx: '<path d="M4 9.5c1.6-2.4 3.2-2.4 4.8 0s3.2 2.4 4.8 0 3.2-2.4 4.8 0"/><path d="M4 15.5c1.6-2.4 3.2-2.4 4.8 0s3.2 2.4 4.8 0 3.2-2.4 4.8 0"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.86.83c0 1.66-2.5 2.5-2.5 2.5"/><path d="M12 17h.01"/>',
  'alert-triangle': '<path d="M10.3 3.9 2.4 17.4a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0"/><path d="M12 9v4.5M12 17h.01"/>',
  shield: '<path d="M12 21s7-3.2 7-9V5.8l-7-2.6-7 2.6V12c0 5.8 7 9 7 9"/>',
  'shield-check': '<path d="M12 21s7-3.2 7-9V5.8l-7-2.6-7 2.6V12c0 5.8 7 9 7 9"/><path d="m9 12 2 2 4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filter: '<path d="M3.5 5h17l-6.6 7.8v5.7l-3.8 2v-7.7z"/>',
  sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3"/><path d="M17 20V4M17 4l-3 3M17 4l3 3"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h4.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20v-1.4A4.6 4.6 0 0 1 9.6 14h4.8a4.6 4.6 0 0 1 4.6 4.6V20"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20v-1.4A4.1 4.1 0 0 1 6.6 14.5h4.8a4.1 4.1 0 0 1 4.1 4.1V20"/><path d="M16.5 4.9a3.4 3.4 0 0 1 0 6.2"/><path d="M18.5 14.7a4.1 4.1 0 0 1 3 3.9V20"/>',
  'user-minus': '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20v-1.4A4.1 4.1 0 0 1 6.6 14.5h4.8a4.1 4.1 0 0 1 4.1 4.1V20"/><path d="M17 11h5"/>',
  message: '<path d="M20.5 12.4a7.6 7.6 0 0 1-8.2 7.6l-.6-.04L7 21.5l.5-3.6A7.6 7.6 0 1 1 20.5 12.4"/>',
  gavel: '<path d="m14.5 3.5 6 6M17.5 6.5 12 12M8 8l8 8"/><path d="m9.5 6.5-6 6 4 4 6-6z"/><path d="M4 21h9"/>',
  rotate: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 4.5V10h-5.5"/>',
  refresh: '<path d="M20.5 11.5A8.5 8.5 0 0 0 6 6.5L3.5 9"/><path d="M3.5 12.5a8.5 8.5 0 0 0 14.5 5l2.5-2.5"/><path d="M3.5 4.5V9H8M20.5 19.5V15H16"/>',
  radar: '<path d="M19.1 5.4a9 9 0 1 1-6.6-2.9"/><path d="M15.5 9a5 5 0 1 0 1.5 3.6"/><path d="m12 12 6.5-6.5"/><circle cx="12" cy="12" r="1.2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12"/><circle cx="12" cy="12" r="3"/>',
  'arrow-up': '<path d="M12 20V4M12 4l-6 6M12 4l6 6"/>',
  'arrow-right': '<path d="M4 12h16M20 12l-6-6M20 12l-6 6"/>',
  'arrow-down': '<path d="M12 4v16M12 20l-6-6M12 20l6-6"/>',
  'arrow-left': '<path d="M20 12H4M4 12l6-6M4 12l6 6"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  download: '<path d="M12 3.5v11M12 14.5 8 10.5M12 14.5l4-4"/><path d="M4 16.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2.5"/>',
  'panel-left': '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9.5 4v16"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 1 1 8 0v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  activity: '<path d="M3 12h4l2.5-6.5 5 13L17 12h4"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4.5h10.5l-1.5 4 1.5 4H5"/>',
  building: '<rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M10 21v-4.5h4V21"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3.2 9.5h17.6M3.2 14.5h17.6"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/>',
  'file-text': '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/><path d="M8.5 13h7M8.5 16.5h5"/>',
  link: '<path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.6 1.6"/><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.6-1.6"/>',
  'trending-up': '<path d="m3 16 5.5-5.5 3.5 3.5L21 5"/><path d="M15.5 5H21v5.5"/>',
  'trending-down': '<path d="m3 8 5.5 5.5 3.5-3.5L21 19"/><path d="M15.5 19H21v-5.5"/>',
  command: '<path d="M8.5 3.5A2.5 2.5 0 1 1 6 6h12a2.5 2.5 0 1 1-2.5-2.5v17A2.5 2.5 0 1 1 18 18H6a2.5 2.5 0 1 1 2.5 2.5z"/>',
  logout: '<path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5"/><path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9"/>',
  briefcase: '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M8.5 7.5v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2"/><path d="M3 12.5h18"/>',
  'map-pin': '<path d="M19 10.5c0 5.3-7 11-7 11s-7-5.7-7-11a7 7 0 1 1 14 0"/><circle cx="12" cy="10.5" r="2.6"/>',
  'id-card': '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.2a3.6 3.6 0 0 1 7 0M14.5 10h4M14.5 13.5h4"/>',
  scale: '<path d="M12 3v18M7 21h10"/><path d="M12 6.5 4.5 9M12 6.5 19.5 9"/><path d="M2 15a2.5 2.5 0 0 0 5 0L4.5 9zM17 15a2.5 2.5 0 0 0 5 0L19.5 9z"/>',
  zap: '<path d="M13.5 2.5 4 13.5h7l-.5 8L20 10.5h-7z"/>',
  layers: '<path d="m12 3 9 4.8-9 4.8-9-4.8z"/><path d="m3 12.6 9 4.8 9-4.8"/><path d="m3 16.8 9 4.8 9-4.8"/>',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      [innerHTML]="markup()"
    ></svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `,
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  readonly size = input(16);
  readonly strokeWidth = input(1.75);

  /**
   * Le sanitizer d'Angular retirerait les balises SVG d'un binding `innerHTML`
   * ordinaire. Les tracés proviennent exclusivement de la table constante
   * ci-dessus — jamais d'une saisie utilisateur — ce qui rend la levée de
   * contrôle sûre pour ce cas précis.
   */
  private readonly trusted = new Map<IconName, SafeHtml>();

  protected readonly markup = computed<SafeHtml>(() => {
    const name = this.name();
    const cached = this.trusted.get(name);
    if (cached) return cached;

    const html = this.sanitizer.bypassSecurityTrustHtml(PATHS[name]);
    this.trusted.set(name, html);
    return html;
  });
}
