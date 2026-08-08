const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'details > summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * Confine la tabulation à l'intérieur d'une surface modale et rend le focus à
 * son point de départ une fois refermée.
 *
 * Sans cela, la tabulation sort du panneau et parcourt la page qui se trouve
 * derrière le voile : l'utilisateur au clavier perd le fil, et les lecteurs
 * d'écran annoncent un contenu inaccessible à la souris. Les deux surfaces
 * modales de l'application — boîte de dialogue et panneau latéral —
 * partagent cette implémentation.
 *
 * Renvoie la fonction de nettoyage à appeler à la fermeture.
 */
export function trapFocus(container: HTMLElement): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusable = focusableWithin(container);
    if (focusable.length === 0) {
      /* Rien de focusable : on garde le focus sur le conteneur lui-même. */
      event.preventDefault();
      container.focus();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === container)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', onKeydown);

  return () => {
    container.removeEventListener('keydown', onKeydown);
    /* Le focus revient à l'élément déclencheur s'il est toujours dans le
       document — un bouton d'action peut avoir disparu entre-temps. */
    if (previouslyFocused?.isConnected) {
      previouslyFocused.focus();
    }
  };
}

/** Place le focus sur le premier élément interactif, sinon sur le conteneur. */
export function focusFirst(container: HTMLElement): void {
  const focusable = focusableWithin(container);
  (focusable[0] ?? container).focus();
}
