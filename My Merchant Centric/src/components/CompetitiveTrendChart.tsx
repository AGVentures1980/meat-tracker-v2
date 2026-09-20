'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Star,
  Award,
  Calendar,
  Info,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';

interface Point {
  timestamp: string;
  dateLabel: string;
  value: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  provenanceMode: string;
  source: string;
  coverageType?: string;
}

interface Series {
  entityId: string;
  name: string;
  role: string;
  provenance: string;
  points: Point[];
}

interface CurrentValue {
  entityId: string;
  entityName: string;
  entityRole: string;
  currentRating: number | null;
  currentReviews: number | null;
}

interface PeriodChange {
  entityId: string;
  entityName: string;
  change: string;
  hasSufficientHistory: boolean;
}

interface HistoryCoverage {
  requestedDays: number;
  observedDays: number;
  earliestObservation: string | null;
  latestObservation: string | null;
  sufficientForRequestedRange: boolean;
  statusMessage: string;
}

interface CompetitiveTrendChartProps {
  locationId?: string;
  organizationId: string;
}

// Color Palette for Entities
const ENTITY_COLORS = [
  '#38bdf8', // Subject Location: Cyan Blue
  '#f59e0b', // Primary Comp 1: Gold / Amber
  '#10b981', // Primary Comp 2: Emerald Green
  '#a855f7', // Purple
  '#ec4899', // Pink
];

export default function CompetitiveTrendChart({ locationId }: CompetitiveTrendChartProps) {
  const [range, setRange] = useState<'30D' | '60D' | '90D'>('30D');
  const [metric, setMetric] = useState<'Google Rating' | 'Review Count' | 'Review Growth' | 'Review Velocity'>('Google Rating');

  const [loading, setLoading] = useState(false);
  const [seriesData, setSeriesData] = useState<Series[]>([]);
  const [currentValues, setCurrentValues] = useState<CurrentValue[]>([]);
  const [periodChanges, setPeriodChanges] = useState<PeriodChange[]>([]);
  const [crossovers, setCrossovers] = useState<string[]>([]);
  const [coverage, setCoverage] = useState<HistoryCoverage | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ entityName: string; point: Point } | null>(null);

  useEffect(() => {
    fetchTrendData();
  }, [locationId, range, metric]);

  const fetchTrendData = async () => {
    if (!locationId || locationId === 'ALL') {
      setSeriesData([]);
      setCurrentValues([]);
      setPeriodChanges([]);
      setCrossovers([]);
      setCoverage(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/scout/trend?locationId=${locationId}&range=${range}&metric=${encodeURIComponent(metric)}`);
      if (res.ok) {
        const data = await res.json();
        setSeriesData(data.series || []);
        setCurrentValues(data.currentValues || []);
        setPeriodChanges(data.periodChanges || []);
        setCrossovers(data.crossovers || []);
        setCoverage(data.historyCoverage || null);
      }
    } catch (err) {
      console.error('Error fetching trend chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!locationId || locationId === 'ALL') {
    return null;
  }

  const noPrimaryCompetitors = coverage?.statusMessage === 'No approved Primary Competitors yet';

  return (
    <section className="card" style={{ padding: '1.5rem', marginTop: '1.5rem', border: '1px solid #242838', borderRadius: '12px' }}>
      
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity className="text-warning" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Competitive Trend
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem', marginBottom: 0 }}>
            Location-scoped historical trend comparing selected location against approved Primary competitors.
          </p>
        </div>

        {/* Chart Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Metric Selector */}
          <div style={{ display: 'flex', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '6px', padding: '0.15rem' }}>
            {(['Google Rating', 'Review Count', 'Review Growth', 'Review Velocity'] as const).map(m => (
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

      {/* Coverage Status Bar */}
      {coverage && (
        <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.78rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} style={{ color: '#c5a880' }} />
            <span><strong>History Status:</strong> {coverage.statusMessage}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: '3px' }} />
            Authentic Snapshots (Zero Synthetic Points)
          </div>
        </div>
      )}

      {/* Current Position & Period Change Summary Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Current Position */}
        <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Current Position
          </div>
          {currentValues.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>No active entries</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {currentValues.map((cv, idx) => (
                <div key={cv.entityId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: '#ffffff', fontWeight: cv.entityRole === 'SUBJECT' ? 700 : 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ENTITY_COLORS[idx % ENTITY_COLORS.length] }}></span>
                    {cv.entityName}
                  </span>
                  <span style={{ fontWeight: 700, color: cv.entityRole === 'SUBJECT' ? '#38bdf8' : '#f59e0b' }}>
                    {metric === 'Review Count' ? (cv.currentReviews ? cv.currentReviews.toLocaleString() : 'N/A') : (cv.currentRating ? `${cv.currentRating}★` : 'N/A')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Period Change */}
        <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Period Change ({range})
          </div>
          {periodChanges.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Insufficient history</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {periodChanges.map((pc, idx) => (
                <div key={pc.entityId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: '#ffffff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ENTITY_COLORS[idx % ENTITY_COLORS.length] }}></span>
                    {pc.entityName}
                  </span>
                  <span style={{ fontWeight: 700, color: pc.hasSufficientHistory ? (pc.change.startsWith('+') ? '#10b981' : pc.change.startsWith('-') ? '#ef4444' : '#9ca3af') : '#6b7280' }}>
                    {pc.change}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Crossovers Warning Bar if events exist */}
      {crossovers.length > 0 && (
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#38bdf8', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={14} />
          <span><strong>Observed Crossover Events:</strong> {crossovers.join(' · ')}</span>
        </div>
      )}

      {/* Main Visual Presentation */}
      {noPrimaryCompetitors ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px' }}>
          <Info size={32} style={{ margin: '0 auto 0.75rem', color: '#9ca3af', opacity: 0.6 }} />
          <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            No Approved Primary Competitors Yet
          </h4>
          <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}>
            Approve direct competitors for this location to populate the Primary Competitive Trend.
          </p>
        </div>
      ) : loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
          Loading competitive trend series...
        </div>
      ) : seriesData.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', color: '#9ca3af', fontSize: '0.85rem' }}>
          Competitive history is being collected for this location.
        </div>
      ) : (
        <div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {seriesData.map((s, idx) => (
              <div key={s.entityId} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: ENTITY_COLORS[idx % ENTITY_COLORS.length], borderRadius: '2px' }}></span>
                <strong style={{ color: s.role === 'SUBJECT' ? '#ffffff' : '#e5e7eb' }}>{s.name}</strong>
                <span style={{ fontSize: '0.72rem', color: s.role === 'SUBJECT' ? '#38bdf8' : '#f59e0b' }}>
                  ({s.role === 'SUBJECT' ? 'Subject' : 'Primary'})
                </span>
              </div>
            ))}
          </div>

          {/* Interactive Series Points */}
          <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '1.25rem', minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {seriesData.map((s, idx) => {
              const color = ENTITY_COLORS[idx % ENTITY_COLORS.length];
              return (
                <div key={s.entityId} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: color, fontWeight: 700 }}>
                      {s.points.length > 0 ? (s.points[s.points.length - 1].value !== null ? `${s.points[s.points.length - 1].value}${metric.includes('Rating') ? '★' : ''}` : 'N/A') : 'N/A'}
                    </span>
                  </div>

                  {/* Points Timeline */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {s.points.map((p, pIdx) => (
                      <div
                        key={pIdx}
                        onMouseEnter={() => setHoveredPoint({ entityName: s.name, point: p })}
                        onMouseLeave={() => setHoveredPoint(null)}
                        style={{
                          backgroundColor: '#161922',
                          border: '1px solid #242838',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }}></span>
                        <span style={{ color: '#9ca3af' }}>{p.dateLabel}:</span>
                        <strong style={{ color: '#ffffff' }}>{p.value !== null ? `${p.value}${metric.includes('Rating') ? '★' : ''}` : 'N/A'}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hover Tooltip Evidence */}
          {hoveredPoint && (
            <div style={{ marginTop: '0.75rem', backgroundColor: '#161922', border: '1px solid #3b82f6', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.78rem', color: '#f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{hoveredPoint.entityName}</strong> ({hoveredPoint.point.dateLabel}):{' '}
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                  {metric} = {hoveredPoint.point.value !== null ? hoveredPoint.point.value : 'N/A'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', gap: '0.75rem' }}>
                <span>Source: {hoveredPoint.point.source}</span>
                <span>Provenance: {hoveredPoint.point.coverageType || 'METADATA_ONLY'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
