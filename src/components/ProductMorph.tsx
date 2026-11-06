// Temporary names pair the clicked image, title and surface with the new hero.
// Names are removed at the end so theme transitions still include every element.
interface SharedPart {
  source: HTMLElement;
  target?: HTMLElement;
  sourceName: string;
  targetName?: string;
  name: string;
  selector: string;
  radius: string;
}

export interface ProductTransition { parts: SharedPart[] }

function visible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

export function captureProductTransition(anchor: HTMLAnchorElement): ProductTransition | null {
  const scope = anchor.closest<HTMLElement>('[data-morph-scope]');
  const image = scope?.querySelector<HTMLElement>('[data-morph-source]') ?? anchor.querySelector<HTMLElement>('[data-morph-source], img');
  if (!image || !visible(image)) return null;
  const icon = image instanceof HTMLImageElement && !image.src.includes('-screens/');
  const parts: SharedPart[] = [];
  const add = (source: HTMLElement | null | undefined, name: string, selector: string) => {
    if (!source || !visible(source) || parts.some(part => part.source === source)) return;
    parts.push({ source, sourceName: source.style.viewTransitionName, name, selector, radius: getComputedStyle(source).borderRadius });
    source.style.viewTransitionName = name;
  };
  add(image, 'product-morph', icon ? '[data-morph-icon]' : '[data-morph-target]');
  add(scope?.querySelector<HTMLElement>('h3, h4'), 'product-title', '[data-morph-title]');
  add(scope?.querySelector<HTMLElement>('.product-card-visual') ?? scope?.closest<HTMLElement>('.works-web-card'), 'product-surface', '[data-morph-surface]');
  return { parts };
}

export function attachProductTransition(state: ProductTransition, main: HTMLElement): void {
  state.parts.forEach(part => { part.source.style.viewTransitionName = part.sourceName; });
  state.parts.forEach(part => {
    const target = main.querySelector<HTMLElement>(part.selector);
    if (!target || !visible(target)) return;
    part.target = target;
    part.targetName = target.style.viewTransitionName;
    target.style.viewTransitionName = part.name;
  });
}

export function animateProductTransition(state: ProductTransition): Animation[] {
  return state.parts.flatMap(part => part.target ? [document.documentElement.animate([
    { borderRadius: part.radius },
    { borderRadius: getComputedStyle(part.target).borderRadius },
  ], { duration: 1150, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both', pseudoElement: `::view-transition-group(${part.name})` })] : []);
}

export function clearProductTransition(state: ProductTransition | null): void {
  state?.parts.forEach(part => {
    part.source.style.viewTransitionName = part.sourceName;
    if (part.target) part.target.style.viewTransitionName = part.targetName ?? '';
  });
}
