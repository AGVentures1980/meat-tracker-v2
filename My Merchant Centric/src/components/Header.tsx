'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import styles from './Header.module.css';
import { Search } from 'lucide-react';
import ScopeSelector from './ScopeSelector';

function HeaderContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasAlerts, setHasAlerts] = useState(false);

  useEffect(() => {
    const fetchAlertStatus = async () => {
      try {
        const res = await fetch('/api/alerts/unread');
        if (res.ok) {
          const data = await res.json();
          setHasAlerts(data.hasUnread);
        }
      } catch (e) {}
    };

    fetchAlertStatus();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    router.push(`/reviews?query=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {/* Custom Enterprise Scope Selector */}
        <ScopeSelector />

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search reviews, employees, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </form>
      </div>

      <div className={styles.rightSection}>
        {/* Live Operational Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--text-positive)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-positive)' }} />
          <span>LIVE DATA</span>
        </div>

        {/* Sync Status Badge */}
        <div className={styles.syncBadge} title="Integrations active and syncing">
          <span className={styles.syncDot} />
          <span>Sync Status: <strong style={{ color: 'var(--text-positive)' }}>Live</strong></span>
        </div>

        {/* Alert Bell Icon */}
        <div className={styles.alertIconWrapper} onClick={() => router.push('/alerts')} style={{ cursor: 'pointer', position: 'relative' }}>
          <span style={{ fontSize: '1.1rem', color: hasAlerts ? 'var(--status-watch)' : 'var(--text-secondary)' }}>🔔</span>
          {hasAlerts && (
            <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-watch)' }} />
          )}
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<div className={styles.header}>Loading Header...</div>}>
      <HeaderContent />
    </Suspense>
  );
}
