import styles from './Topbar.module.scss';

interface TopbarProps {
  onHome: () => void;
}

/**
 * Identity only. The clinic finder is reached from the risk form and the result,
 * where it answers a question the reader has just been asked; a permanent button
 * here would compete with the step they are on.
 */
export function Topbar({ onHome }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <a
        className={styles.brand}
        href="#profile"
        onClick={(event) => {
          // Let modified clicks (new tab, save) behave normally.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onHome();
        }}
      >
        <span className={styles.mark} aria-hidden="true">
          <span />
        </span>
        <span>FutureWell</span>
      </a>
    </header>
  );
}
