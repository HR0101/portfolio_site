// CSS owns appearance; WAAPI owns the entrance; one event-driven rAF owns interaction.
const root = document;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const compact = matchMedia('(max-width: 760px)');
const EASE = 'cubic-bezier(.16,1,.3,1)';

// Keep the full accessible heading; only its visual copy is split.
root.querySelectorAll('[data-split]').forEach(line => {
  const text = line.textContent;
  line.setAttribute('aria-hidden', 'true');
  line.replaceChildren(...Array.from(text, character => {
    const mask = document.createElement('span');
    const glyph = document.createElement('span');
    mask.className = 'char-mask';
    glyph.className = 'char';
    glyph.textContent = character;
    mask.append(glyph);
    return mask;
  }));
});

export function mountMotion(scope = document, { intro = true } = {}) {
  if (reduced.matches) return () => {};
  const controller = new AbortController();
  const { signal } = controller;
  const animations = new Set();
  const originals = new Map();
  const remember = element => {
    if (!originals.has(element)) originals.set(element, element.getAttribute('style'));
    return element;
  };
  const animate = (element, frames, options) => {
    const animation = element.animate(frames, { easing: EASE, ...options });
    animations.add(animation);
    animation.finished.then(() => {
      animations.delete(animation);
      animation.cancel(); // Return to the visible, static CSS end state.
    }).catch(() => {});
    return animation;
  };
  if (intro) {
    scope.querySelectorAll('.char').forEach((glyph, index) => {
      animate(glyph, [
        { transform: `translate3d(${(index % 3 - 1) * 20}px,115%,0) rotateX(-75deg) rotateZ(${index % 2 ? 9 : -9}deg)`, opacity: .2 },
        { transform: 'translate3d(0,0,0) rotateX(0) rotateZ(0)', opacity: 1 },
      ], { duration: 1100, delay: 100 + index * 38, fill: 'backwards' });
    });
    scope.querySelectorAll('[data-intro]').forEach((element, index) => {
      animate(element, [{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 850, delay: 350 + index * 100, fill: 'backwards' });
    });
    scope.querySelectorAll('.orbit-intro').forEach((element, index) => {
      animate(element, [{ transform: `translate(${index === 1 ? -90 : 70}px,${index === 2 ? -65 : 60}px) scale(.45) rotate(-22deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 1250, delay: 180 + index * 110, fill: 'backwards' });
    });
    animate(scope.querySelector('.core'), [{ transform: 'rotate(25deg) scale(.2)', opacity: 0 }, { transform: 'rotate(-14deg) scale(1)', opacity: 1 }], { duration: 1300 });
    animate(scope.querySelector('.intro-rule'), [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: .75 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 1100 });
  }

  const cursor = remember(scope.querySelector('.cursor'));
  const title = remember(scope.querySelector('.title-scroll'));
  const universe = remember(scope.querySelector('.universe'));
  const peach = remember(scope.querySelector('.wash-peach'));
  const blue = remember(scope.querySelector('.wash-blue'));
  const cue = remember(scope.querySelector('.scroll-cue'));
  const runway = scope.querySelector('.runway');
  const orbits = [...scope.querySelectorAll('.orbit-scroll')].map(element => ({ element: remember(element), depth: Number(element.dataset.depth) }));
  const magnets = [...scope.querySelectorAll('[data-magnetic]')].map(element => ({ element: remember(element), x: 0, y: 0 }));
  let pointer = { x: 0, y: 0 }, current = { x: 0, y: 0 }, hasPointer = false;
  let hoveredMagnet = null, hoveredCard = null;
  let scrollTarget = 0, progress = 0, needsMeasure = true;
  let runwayTop = 0, scrollLength = 1;
  let frame = 0, previousTime = 0;

  const request = () => {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const measure = () => {
    runwayTop = runway.getBoundingClientRect().top + scrollY;
    scrollLength = Math.max(1, runway.offsetHeight - innerHeight);
    needsMeasure = false;
  };
  function tick(now) {
    frame = 0;
    const dt = previousTime ? Math.min(now - previousTime, 48) : 16.67;
    previousTime = now;
    const alpha = 1 - Math.exp(-dt / 75); // Stable speed on 60 Hz and 120 Hz screens.
    if (needsMeasure) measure();
    scrollTarget = compact.matches ? 0 : Math.min(1, Math.max(0, (scrollY - runwayTop) / scrollLength));
    progress += (scrollTarget - progress) * alpha;
    let moving = Math.abs(scrollTarget - progress) > .0003;

    // Measure interactive geometry before writing styles.
    const magnet = magnets.find(item => item.element === hoveredMagnet);
    const bounds = magnet?.element.getBoundingClientRect();
    const cardBounds = hoveredCard?.getBoundingClientRect();
    const mx = bounds ? Math.max(-1, Math.min(1, (pointer.x - (bounds.left + bounds.width / 2 - magnet.x)) / (bounds.width / 2))) : 0;
    const my = bounds ? Math.max(-1, Math.min(1, (pointer.y - (bounds.top + bounds.height / 2 - magnet.y)) / (bounds.height / 2))) : 0;
    const cursorTarget = bounds ? { x: pointer.x * .65 + (bounds.left + bounds.width / 2) * .35, y: pointer.y * .65 + (bounds.top + bounds.height / 2) * .35 } : pointer;
    current.x += (cursorTarget.x - current.x) * alpha;
    current.y += (cursorTarget.y - current.y) * alpha;
    moving ||= hasPointer && Math.hypot(cursorTarget.x - current.x, cursorTarget.y - current.y) > .15;

    title.style.transform = `translate3d(0,${-progress * 70}px,0) rotateX(${progress * 10}deg)`;
    universe.style.transform = `translate3d(0,${-progress * 100}px,0) rotateZ(${progress * 12}deg)`;
    blue.style.opacity = String(1 - progress * .7);
    peach.style.opacity = String(progress);
    cue.style.opacity = String(1 - progress);
    orbits.forEach(({ element, depth }) => {
      element.style.transform = `translate3d(${depth * progress * 35}px,${depth * progress * -85}px,0) rotate(${depth * progress * 18}deg)`;
    });
    if (hasPointer && fine.matches && !compact.matches) {
      cursor.style.opacity = '1';
      cursor.style.transform = `translate3d(${current.x}px,${current.y}px,0)`;
    }
    magnets.forEach(item => {
      const tx = item === magnet ? mx * 7 : 0;
      const ty = item === magnet ? my * 7 : 0;
      item.x += (tx - item.x) * alpha;
      item.y += (ty - item.y) * alpha;
      moving ||= Math.abs(tx - item.x) + Math.abs(ty - item.y) > .03;
      item.element.style.transform = `translate3d(${item.x}px,${item.y}px,0)`;
    });
    if (hoveredCard && cardBounds) {
      const x = (pointer.x - cardBounds.left) / cardBounds.width - .5;
      const y = (pointer.y - cardBounds.top) / cardBounds.height - .5;
      const image = remember(hoveredCard.querySelector('.work-image'));
      image.style.transform = `translate3d(${x * 13}px,${y * 13}px,0)`;
    }
    if (moving) request();
    else previousTime = 0; // Sleep when settled; no permanent render loop.
  }
  const clearHover = () => {
    hoveredMagnet = null;
    if (hoveredCard) hoveredCard.querySelector('.work-image').style.transform = '';
    hoveredCard = null;
    cursor.removeAttribute('data-mode');
  };
  window.addEventListener('pointermove', event => {
    if (!fine.matches || compact.matches || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!hasPointer) current = { ...pointer };
    hasPointer = true;
    request();
  }, { signal, passive: true });
  document.addEventListener('pointerover', event => {
    if (!fine.matches || compact.matches || event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target : null;
    const nextCard = target?.closest('[data-work]') ?? null;
    if (hoveredCard !== nextCard && hoveredCard) hoveredCard.querySelector('.work-image').style.transform = '';
    hoveredCard = nextCard;
    hoveredMagnet = target?.closest('[data-magnetic]') ?? null;
    cursor.dataset.mode = hoveredCard ? 'work' : target?.closest('a,button') ? 'link' : '';
    request();
  }, { signal, passive: true });
  const leave = () => { hasPointer = false; cursor.style.opacity = '0'; clearHover(); request(); };
  document.documentElement.addEventListener('pointerleave', leave, { signal });
  window.addEventListener('blur', leave, { signal });
  window.addEventListener('scroll', () => { clearHover(); request(); }, { signal, passive: true });
  window.addEventListener('resize', () => { needsMeasure = true; request(); }, { signal, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; leave(); }
    else { needsMeasure = true; request(); }
  }, { signal });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const index = [...scope.querySelectorAll('[data-work]')].indexOf(entry.target);
      animate(entry.target, [{ transform: 'translateY(55px) rotateX(9deg)', opacity: .1 }, { transform: 'none', opacity: 1 }], { duration: 950, delay: compact.matches ? 0 : index * 90, fill: 'backwards' });
      observer.unobserve(entry.target);
    });
  }, { threshold: .14 });
  scope.querySelectorAll('[data-work]').forEach(card => observer.observe(card));
  request();
  return () => {
    controller.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
    cursor.removeAttribute('data-mode');
    originals.forEach((style, element) => style === null ? element.removeAttribute('style') : element.setAttribute('style', style));
  };
}

let dispose = mountMotion();
const reconfigure = () => { dispose(); dispose = mountMotion(root, { intro: false }); };
reduced.addEventListener('change', reconfigure);
fine.addEventListener('change', reconfigure);
compact.addEventListener('change', reconfigure);
window.addEventListener('pagehide', () => { dispose(); }, { once: false });
window.addEventListener('pageshow', event => { if (event.persisted) { dispose(); dispose = mountMotion(root, { intro: false }); } });
