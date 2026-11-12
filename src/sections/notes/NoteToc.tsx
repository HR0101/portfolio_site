'use client';

import { useEffect, useState } from 'react';
import { NOTE_SECTIONS } from './NoteSection';
import styles from './notes.module.css';

const TOC_ROOT_MARGIN = '-100px 0px -45% 0px';

export function NoteToc() {
  const [active, setActive] = useState<string>(NOTE_SECTIONS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      const current = [...visible].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (current) setActive(current.id);
    }, { rootMargin: TOC_ROOT_MARGIN, threshold: 0 });
    for (const section of NOTE_SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={styles.toc} aria-label="この記事の目次">
      <p>この記事の中で</p>
      <ol>{NOTE_SECTIONS.map(section => <li key={section.id}>
        <a href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined} onClick={() => setActive(section.id)}>{section.title}</a>
      </li>)}</ol>
    </nav>
  );
}
