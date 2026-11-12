import { NOTES_REPOSITORY } from '../../data/notes';
import styles from './notes.module.css';

export function CodeSnippet({ source, code }: { source: string; code: string }) {
  return (
    <figure className={styles.codeSnippet}>
      <pre tabIndex={0} aria-label={`${source}のコード抜粋`}><code>{code}</code></pre>
      <figcaption>実コードの抜粋：<a href={`${NOTES_REPOSITORY}/blob/main/${source}`}>{source}</a></figcaption>
    </figure>
  );
}
