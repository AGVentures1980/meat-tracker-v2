'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Info,
  ShieldCheck,
  Award,
  Layers,
  BarChart3
} from 'lucide-react';

interface Ratings {
  overall: number;
  food: number;
  service: number;
  ambience: number;
  value: number;
}

interface Period {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  ratings: Ratings;
  reviewCount: number;
  positiveCount: number;
  negativeCount: number;
  responseRate: number;
  newResponsesCount: number;
  sources: string[];
  value: number | null;
}

interface GuestExperienceTrendChartProps {
  locationId?: string;
  organizationId: string;
}

export default function GuestExperienceTrendChart({ locationId }: GuestExperienceTrendChartProps) {
  const [range, setRange] = useState<'30D' | '60D' | '90D'>('30D');
  const [metric, setMetric] = useState<string>('Overall Rating');
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [granularity, setGranularity] = useState<string>('MONTHLY');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [trendAvailable, setTrendAvailable] = useState<boolean>(false);

  useEffect(() => {
    fetchGuestExperienceData();
  }, [locationId, range, metric]);

  const fetchGuestExperienceData = async () => {
    if (!locationId || locationId === 'ALL') {
      setPeriods([]);
      setStatusMessage('');
      setTrendAvailable(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/guest-experience-trend?locationId=${locationId}&range=${range}&metric=${encodeURIComponent(metric)}`);
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods || []);
        setGranularity(data.granularity || 'MONTHLY');
        setStatusMessage(data.statusMessage || '');
        setTrendAvailable(data.trendAvailable || false);
      }
    } catch (err) {
      console.error('Error fetching guest experience trend:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!locationId || locationId === 'ALL') {
    return null;
  }

  const latestPeriod = periods.length > 0 ? periods[0] : null;

  return (
    <section className="card" style={{ padding: '1.5rem', marginTop: '1.5rem', border: '1px solid #242838', borderRadius: '12px' }}>
      
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare className="text-info" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Guest Experience Trend
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem', marginBottom: 0 }}>
            Multichannel review intelligence tracking guest rating dimensions and review behavior over time.
          </p>
        </div>

        {/* Chart Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Metric Selector */}
          <div style={{ display: 'flex', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '6px', padding: '0.15rem' }}>
            {['Overall Rating', 'Food Rating', 'Service Rating', 'Ambience Rating', 'Value Rating', 'Review Volume', 'Response Rate'].map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                style={{
                  backgroundColor: metric === m ? '#242838' : 'transparent',
                  color: metric === m ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: metric === m ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Range Selector */}
          <div style={{ display: 'flex', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '6px', padding: '0.15rem' }}>
            {(['30D', '60D', '90D'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  backgroundColor: range === r ? '#242838' : 'transparent',
                  color: range === r ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: range === r ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coverage & Status Bar */}
      {statusMessage && (
        <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.78rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} style={{ color: '#3b82f6' }} />
            <span><strong>Granularity:</strong> {granularity} · {statusMessage}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: '3px' }} />
            Authentic Multichannel Evidence (Google, Yelp, OpenTable)
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
          Loading guest experience intelligence...
        </div>
      ) : periods.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px' }}>
          <Info size={32} style={{ margin: '0 auto 0.75rem', color: '#9ca3af', opacity: 0.6 }} />
          <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            No Authenticated Guest Experience History Yet
          </h4>
          <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}>
            Import review datasets or connect first-party review feeds to activate guest experience analytics for this location.
          </p>
        </div>
      ) : (
        <div>
          {/* Rating Breakdown Cards Grid */}
          {latestPeriod && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Overall Rating</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.15rem' }}>{latestPeriod.ratings.overall}★</div>
              </div>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Food Rating</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '0.15rem' }}>{latestPeriod.ratings.food}★</div>
              </div>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Service Rating</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.15rem' }}>{latestPeriod.ratings.service}★</div>
              </div>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Ambience Rating</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7', marginTop: '0.15rem' }}>{latestPeriod.ratings.ambience}★</div>
              </div>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Value Rating</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ec4899', marginTop: '0.15rem' }}>{latestPeriod.ratings.value}★</div>
              </div>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Review Volume</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.15rem' }}>{latestPeriod.reviewCount}</div>
              </div>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Positive / Negative</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                  {latestPeriod.positiveCount} <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>/ {latestPeriod.negativeCount}</span>
                </div>
              </div>
              <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Response Rate</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.15rem' }}>{latestPeriod.responseRate}%</div>
              </div>
            </div>
          )}

          {/* Period Details Box */}
          <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                Period: {latestPeriod?.periodLabel} (Aug 1, 2026 – Aug 31, 2026)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Source Lineage: <strong>{latestPeriod?.sources.join(', ')}</strong> · Multichannel Aggregate
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>
                Trend Status
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b', marginTop: '0.15rem' }}>
                {trendAvailable ? 'Active Trend' : 'Trend not yet available (1 period)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
