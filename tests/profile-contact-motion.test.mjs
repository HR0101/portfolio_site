import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const react = require('react');

// DOM の見た目ではなく，実部品のイベント・購読・タイマーの寿命を検証します．
function componentHarness(file, exportName, mocks = {}) {
  let cursor = 0;
  let pending = [];
  const slots = [];
  const hooks = {
    ...react,
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, (value) => {
        slots[index].value = typeof value === 'function' ? value(slots[index].value) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && deps?.every((value, i) => Object.is(value, previous.deps?.[i]))) return;
      pending.push(() => {
        previous?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
    useCallback(callback) { return callback; },
  };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name === 'react') return hooks;
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return new Proxy({}, { get: (_, key) => String(key) });
    return require(name);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return {
    render(props = {}) { cursor = 0; return module.exports[exportName](props); },
    flush() { const effects = pending; pending = []; effects.forEach((effect) => effect()); },
    dispose() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => elements(child, predicate));
  if (!node?.props) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}
function find(node, predicate) {
  const found = elements(node, predicate)[0];
  assert.ok(found, '対象の要素が存在します');
  return found;
}
function replaceGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  t.after(() => original ? Object.defineProperty(globalThis, name, original) : delete globalThis[name]);
}

function contactHarness(t, reducedMotion = false) {
  const fields = new Map(['name', 'email', 'message'].map((name) => {
    const field = { animations: [], focusCount: 0, focus() { this.focusCount++; }, animate(frames, options) {
      const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      this.animations.push(animation);
      return animation;
    } };
    return [`contact-${name}`, field];
  }));
  replaceGlobal(t, 'document', { documentElement: {}, getElementById: (id) => fields.get(id) });
  replaceGlobal(t, 'window', { location: { href: '' } });
  replaceGlobal(t, 'getComputedStyle', () => ({ getPropertyValue: () => 'cubic-bezier(0.23, 1, 0.32, 1)' }));
  const harness = componentHarness('../src/sections/Contact.tsx', 'Contact', {
    '../hooks/usePrefersReducedMotion': { usePrefersReducedMotion: () => reducedMotion },
    '../config/site': { siteConfig: { email: 'test@example.com', githubUrl: 'https://github.com/test', githubUsername: 'test' } },
    '../config/features': { FEATURES: { contactIntro: false } },
    '../data/profile': { PROFILE_FACTS: {}, normalizeProfileFacts: () => ({}) },
  });
  t.after(() => harness.dispose());
  let tree = harness.render();
  harness.flush();
  return {
    fields,
    render() { tree = harness.render(); harness.flush(); return tree; },
    submit() { find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); return this.render(); },
    change(name, value) { find(tree, (node) => node.props.id === `contact-${name}`).props.onChange({ target: { name, value } }); return this.render(); },
  };
}

test('エラー再送信で揺れを再生し直し，最初の項目へフォーカスし，修正した項目だけエラーを消します', (t) => {
  const contact = contactHarness(t);
  contact.submit();
  contact.submit();
  for (const field of contact.fields.values()) {
    assert.equal(field.animations.length, 2);
    assert.equal(field.animations[0].cancelled, true);
    assert.equal(field.animations[1].options.duration, 240);
    assert.deepEqual(field.animations[1].frames.map((frame) => frame.transform), ['translateX(0px)', 'translateX(-4px)', 'translateX(4px)', 'translateX(-2px)', 'translateX(0px)']);
  }
  assert.equal(contact.fields.get('contact-name').focusCount, 2);
  const tree = contact.change('name', 'テスト');
  assert.equal(find(tree, (node) => node.props.id === 'contact-name').props['aria-invalid'], false);
  assert.equal(find(tree, (node) => node.props.id === 'contact-email').props['aria-invalid'], true);
});

test('reduced-motion では検証・フォーカスを保ち，入力欄を揺らしません', (t) => {
  const contact = contactHarness(t, true);
  contact.submit();
  for (const field of contact.fields.values()) assert.equal(field.animations.length, 0);
  assert.equal(contact.fields.get('contact-name').focusCount, 1);
});

test('メール形式・本文の下限検証と，有効な入力の mailto 内容を保ちます', (t) => {
  const contact = contactHarness(t);
  contact.change('name', 'テスト & 名前');
  contact.change('email', 'invalid');
  contact.change('message', '123456789');
  let tree = contact.submit();
  assert.equal(find(tree, (node) => node.props.id === 'contact-email').props['aria-invalid'], true);
  assert.equal(find(tree, (node) => node.props.id === 'contact-message').props['aria-invalid'], true);
  assert.equal(window.location.href, '');
  contact.change('email', 'test@example.com');
  contact.change('message', '1234567890');
  tree = contact.submit();
  const mailto = new URL(window.location.href);
  assert.equal(mailto.protocol, 'mailto:');
  assert.equal(mailto.pathname, 'test@example.com');
  assert.equal(mailto.searchParams.get('subject'), '【ポートフォリオ】テスト & 名前 様からのお問い合わせ');
  assert.equal(mailto.searchParams.get('body'), 'お名前: テスト & 名前\nメールアドレス: test@example.com\n\n1234567890');
  assert.equal(find(tree, (node) => node.props.role === 'status').props['aria-live'], 'polite');
});

test('コピー連打では最後の完了から 1800ms 後に戻り，古い完了は新しい表示を上書きしません', async (t) => {
  const writes = [];
  const timers = new Map();
  let nextTimer = 0;
  replaceGlobal(t, 'navigator', { clipboard: { writeText: (value) => new Promise((resolve) => writes.push({ value, resolve })) } });
  replaceGlobal(t, 'setTimeout', (callback, ms) => { timers.set(++nextTimer, { callback, ms }); return nextTimer; });
  replaceGlobal(t, 'clearTimeout', (id) => timers.delete(id));
  const copy = componentHarness('../src/components/CopyEmailButton.tsx', 'CopyEmailButton');
  t.after(() => copy.dispose());
  const render = () => copy.render({ email: 'test@example.com' });
  let tree = render();
  copy.flush();
  const button = () => find(tree, (node) => node.type === 'button');
  const first = button().props.onClick();
  const second = button().props.onClick();
  writes[1].resolve();
  await second;
  writes[0].resolve();
  await first;
  tree = render();
  assert.equal(tree.props['data-copied'], true);
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].ms, 1800);
  const third = button().props.onClick();
  assert.equal(timers.size, 0);
  writes[2].resolve();
  await third;
  [...timers.values()][0].callback();
  assert.equal(render().props['data-copied'], false);
  assert.ok(writes.every(({ value }) => value === 'test@example.com'));
});

test('年表の線はスクロールと比例して戻り，節目の初回登場は巻き戻しません', (t) => {
  let update;
  let top = 500;
  const milestones = Array.from({ length: 4 }, () => ({ dataset: { reached: 'false', entered: 'false' } }));
  replaceGlobal(t, 'window', { innerHeight: 1000 });
  const timeline = componentHarness('../src/components/ScrollTimeline.tsx', 'ScrollTimeline', {
    '../hooks/usePrefersReducedMotion': { usePrefersReducedMotion: () => false },
    '../lib/scrollObserver': { clamp: (value) => Math.max(0, Math.min(value, 1)), subscribeToScroll(callback) { update = callback; callback(); return () => {}; } },
    '../lib/choreography': { staggerDelay: (index, { stepMs }) => index * stepMs },
    '../data/timeline': { TIMELINE_MILESTONES: milestones.map((_, index) => ({ period: String(index), apps: [] })) },
  });
  t.after(() => timeline.dispose());
  const tree = timeline.render();
  tree.ref.current = { getBoundingClientRect: () => ({ top, height: 1000 }), querySelectorAll: () => milestones };
  const line = find(tree, (node) => node.props.className?.includes('timelineLine'));
  const tip = find(tree, (node) => node.props.className?.includes('timelineTip'));
  line.ref.current = { style: {} };
  tip.ref.current = { style: {} };
  timeline.flush();
  assert.equal(line.ref.current.style.transform, 'scaleY(0.12)');
  top = 120;
  update();
  assert.equal(line.ref.current.style.transform, 'scaleY(0.5)');
  assert.deepEqual(milestones.map((node) => node.dataset.entered), ['true', 'true', 'false', 'false']);
  top = 500;
  update();
  assert.equal(line.ref.current.style.transform, 'scaleY(0.12)');
  assert.equal(milestones[0].dataset.reached, 'false');
  assert.equal(milestones[0].dataset.entered, 'true');
});
