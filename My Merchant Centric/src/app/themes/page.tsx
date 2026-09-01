'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Flame, RefreshCw, Building2 } from 'lucide-react';

interface ThemeItem {
  name: string;
  sentiment: number;
  volume: number;
  status: 'STRENGTH' | 'GAP';
  description: string;
}

function ThemesContent() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');

  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [themes, setThemes] = useState<ThemeItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!locationId || locationId === 'ALL') {
        setLocationName('Texas de Brazil Enterprise Network');
        setThemes([]);
        setLoading(false);
        return;
      }

      const locRes = await fetch('/api/locations');
      if (locRes.ok) {
        const locs = await locRes.json();
        const matched = locs.find((l: any) => l.id === locationId);
        if (matched) setLocationName(matched.name);
      }

      const intelRes = await fetch(`/api/reviews/intelligence?locationId=${locationId}`);
      if (intelRes.ok) {
        const data = await intelRes.json();
        if (data.reviewsAnalyzedCount > 0 && data.operationalAggregationTable) {
          const list: ThemeItem[] = data.operationalAggregationTable.map((op: any) => ({
            name: op.issueCategory.replace(/_/g, ' '),
            sentiment: op.positiveReviewCount > op.negativeReviewCount ? 90 : 40,
            volume: op.uniqueReviewCount,
            status: op.positiveReviewCount >= op.negativeReviewCount ? 'STRENGTH' : 'GAP',
            description: `${op.uniqueReviewCount} unique guest review ${op.uniqueReviewCount === 1 ? 'mention' : 'mentions'} supporting this operational signal.`
          }));
          setThemes(list);
        } else {
          setThemes([]);
        }
      }
    } catch (e) {
      console.error('Error fetching themes:', e);
      setThemes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <div>
              <h1 className="page-title flex-align" style={{ gap: '0.5rem' }}>
                <Flame className="text-warning" size={24} />
                <span>Themes & Operational Gaps</span>
              </h1>
              <p className="page-subtitle">
                {locationName ? `Root-cause thematic NLP breakdown for ${locationName}.` : 'Root-cause thematic NLP breakdown and operational gaps.'}
              </p>
            </div>
            <button onClick={fetchData} disabled={loading} className="btn btn-secondary flex-align" style={{ gap: '0.5rem' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Recalculate Themes</span>
            </button>
          </div>

          {themes.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px' }}>
              <Building2 size={40} style={{ margin: '0 auto 1rem', color: '#9ca3af', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                No Authenticated Thematic Intelligence Available
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
                No root-cause NLP thematic evidence or review corpus exists for {locationName || 'this location'} yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {themes.map((th, idx) => (
                <div key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: '75%' }}>
                    <div className="flex-align" style={{ gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{th.name}</strong>
                      <span className={`badge ${th.status === 'STRENGTH' ? 'badge-healthy' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        {th.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{th.description}</p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: th.sentiment >= 85 ? 'var(--text-positive)' : 'var(--accent-gold)' }}>
                      {th.sentiment}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {th.volume} guest mentions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ThemesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Themes...</div>}>
      <ThemesContent />
    </Suspense>
  );
}
