export const SECTION_NAVIGATION_EVENT = 'portfolio:section-navigation';

export interface SectionNavigationRequest {
  id: string;
  delayMs?: number;
}

// The shared controller supplies the transition. Keep ordinary navigation as
// a fallback if a caller runs before the controller has mounted.
export function navigateToSection(id: string, delayMs = 0): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  const handled = !window.dispatchEvent(new CustomEvent<SectionNavigationRequest>(SECTION_NAVIGATION_EVENT, {
    cancelable: true,
    detail: { id, delayMs },
  }));
  if (!handled) {
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return true;
}
