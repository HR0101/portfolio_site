import type { ProfileFacts } from '../data/profile';
import styles from './AvailabilityBadge.module.css';

interface AvailabilityBadgeProps {
  availability?: ProfileFacts['availability'];
}

export function AvailabilityBadge({ availability }: AvailabilityBadgeProps) {
  const label = availability?.label.trim();
  const detail = availability?.detail?.trim();
  if (!label) return null;

  return (
    <p className={styles.availability} data-testid="profile-availability">
      <span>
        <strong>{label}</strong>
        {detail && <span className={styles.detail}>{detail}</span>}
      </span>
    </p>
  );
}
