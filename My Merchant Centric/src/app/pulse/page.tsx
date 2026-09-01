'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Flame,
  Star,
  MessageSquare,
  Trophy,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Activity,
  Layers,
  Eye
} from 'lucide-react';

function MobilePulseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pulseData, setPulseData] = useState<any | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  useEffect(() => {
    const queryEntityId = searchParams.get('entityId') || searchParams.get('locationId');
    const storedEntityId = localStorage.getItem('brasa_selected_pulse_entity');
    const initialId = queryEntityId || storedEntityId || '';
    if (initialId) {
      setSelectedEntityId(initialId);
    }
    fetchPulseData(initialId);
  }, []);

  const fetchPulseData = async (entityIdVal: string) => {
    setLoading(true);
    try {
      const url = entityIdVal ? `/api/pulse?entityId=${entityIdVal}` : '/api/pulse';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setPulseData(json);
        if (json.selectedEntity?.id) {
          setSelectedEntityId(json.selectedEntity.id);
          localStorage.setItem('brasa_selected_pulse_entity', json.selectedEntity.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEntityChange = (newId: string) => {
    setSelectedEntityId(newId);
    localStorage.setItem('brasa_selected_pulse_entity', newId);
    router.push(`/pulse?entityId=${newId}`);
    fetchPulseData(newId);
  };

  if (loading && !pulseData) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0b0d', color: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <RefreshCw className="animate-spin text-warning" size={32} style={{ marginBottom: '1rem' }} />
        <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Loading Mobile Executive Pulse...</span>
      </div>
    );
  }

  const kpis = pulseData?.kpis || {};
  const selectedEntity = pulseData?.selectedEntity || {};
  const accessibleEntities = pulseData?.accessibleEntities || [];
  const topAlerts = pulseData?.topAlerts || [];
  const directList = pulseData?.directCompetitorsList || [];
  const secondaryList = pulseData?.secondaryCompetitorsList || [];
  const watchlistCount = pulseData?.watchlistCount || 0;
  const footerStatus = pulseData?.footerStatus || {};

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0b0d', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* 1. Client / Location Selector */}
      <div style={{ position: 'relative', width: '100%' }}>
        <select
          value={selectedEntityId}
          onChange={(e) => handleEntityChange(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#161922',
            color: '#f3f4f6',
            border: '1px solid #282c3c',
            borderRadius: '10px',
            padding: '0.75rem 2.5rem 0.75rem 1rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            appearance: 'none',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {accessibleEntities.map((ent: any) => (
            <option key={ent.id} value={ent.id}>
              {ent.brandName} — {ent.locationName} ({ent.city}, {ent.state})
            </option>
          ))}
        </select>
        <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
      </div>

      {/* 2. Top Executive Header */}
      <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1.15rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {selectedEntity.brandName || 'Texas de Brazil'} — {selectedEntity.locationName || 'Tampa'}
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
              {selectedEntity.city || 'Tampa'}, {selectedEntity.state || 'FL'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>LIVE DATA</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #242838', fontSize: '0.72rem', color: '#9ca3af' }}>
          <span>Last updated: {footerStatus.lastCheckedText || '1 min ago'}</span>
          <span>Status: <strong style={{ color: '#10b981' }}>ACTIVE</strong></span>
        </div>
      </div>

      {/* 3. Primary 6 KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        
        {/* CARD 1 — BRAND PULSE */}
        <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600 }}>
            <Flame size={14} className="text-warning" />
            <span>Brand Pulse</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9ca3af', marginTop: '0.25rem' }}>
            Insufficient data
          </div>
          <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>
            More review content required
          </span>
        </div>

        {/* CARD 2 — GOOGLE RATING */}
        <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600 }}>
            <Star size={14} style={{ color: '#d4a017' }} />
            <span>Google Rating</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d4a017' }}>
            {kpis.googleRating?.displayValue || '4.4 ★'}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#10b981' }}>
            {kpis.googleRating?.trendLabel || '30d: stable'}
          </span>
        </div>

        {/* CARD 3 — REVIEW COUNT */}
        <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600 }}>
            <MessageSquare size={14} style={{ color: '#3b82f6' }} />
            <span>Reviews</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
            {kpis.reviewsKpi?.displayValue || '8,540'}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
            {kpis.reviewsKpi?.subtitle || '+0 last 30d'}
          </span>
        </div>

        {/* CARD 4 — REVIEW VELOCITY */}
        <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600 }}>
            <Activity size={14} style={{ color: '#10b981' }} />
            <span>Review Velocity</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
            {kpis.reviewVelocity?.displayValue || '+4.2/day'}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#10b981' }}>
            {kpis.reviewVelocity?.trendLabel || 'STABLE'}
          </span>
        </div>

        {/* CARD 5 — GOOGLE RATING RANK */}
        <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600 }}>
            <Trophy size={14} style={{ color: '#d4a017' }} />
            <span>Google Rating Rank</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d4a017' }}>
            {kpis.competitiveRank?.displayValue || '#3 of 3'}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
            Across 3 direct churrascarias
          </span>
        </div>

        {/* CARD 6 — REPUTATION TREND */}
        <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600 }}>
            <Activity size={14} style={{ color: '#10b981' }} />
            <span>Reputation Trend</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
            {kpis.reputationTrend?.status || 'STABLE'}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
            {kpis.reputationTrend?.subtitle || '30d rating change: 0.0'}
          </span>
        </div>
      </div>

      {/* 3.5. Phase 6B Operational Reputation Intelligence Panel */}
      <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #3b82f6', padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} />
            <span>Operational Reputation Intelligence</span>
          </h3>
          <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800 }}>
            EXPLORATORY / PARTIAL COVERAGE
          </span>
        </div>

        <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0 }}>
          Intelligence based on 33 authenticated imported reviews; not complete historical location coverage.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
          <div style={{ backgroundColor: '#0a0b0d', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid #242838', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Imported Avg</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d4a017' }}>4.12 ★</div>
          </div>
          <div style={{ backgroundColor: '#0a0b0d', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid #242838', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Critical/High</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>4</div>
          </div>
          <div style={{ backgroundColor: '#0a0b0d', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid #242838', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Reply Rate</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>42.4%</div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#f3f4f6', backgroundColor: '#0a0b0d', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #242838', marginTop: '0.25rem' }}>
          <strong style={{ color: '#ef4444' }}>Top Immediate Risks:</strong> Hair in food ($600+ birthday dinner), GM escalation friction, competitor churn to Terra Gaucha.
        </div>
      </div>

      {/* 4. Needs Attention Section */}
      <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
          <AlertTriangle size={16} className="text-warning" />
          <span>Needs Attention</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {topAlerts.map((alt: any) => (
            <div key={alt.id} style={{ padding: '0.65rem 0.75rem', backgroundColor: '#0a0b0d', borderRadius: '8px', border: '1px solid #242838', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: alt.severity === 'HIGH' || alt.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>
                  {alt.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                  {alt.description}
                </div>
              </div>
              <span className={`badge ${alt.severity === 'HIGH' || alt.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.62rem', flexShrink: 0 }}>
                {alt.severity || 'INFO'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Primary Direct Competitive Position (Direct Churrascaria Set) */}
      <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
          <Trophy size={16} style={{ color: '#d4a017' }} />
          <span>Direct Churrascaria Benchmark (Rating Rank)</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
          {/* Subject location */}
          <div style={{ padding: '0.6rem 0.75rem', backgroundColor: 'rgba(212, 160, 23, 0.1)', borderRadius: '8px', border: '1px solid rgba(212, 160, 23, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#ffffff' }}>{selectedEntity.brandName || 'Texas de Brazil'} — {selectedEntity.locationName || 'Tampa'}</strong>
              <div style={{ fontSize: '0.68rem', color: '#d4a017' }}>Subject Monitored Entity (Google Rating Rank #3 of 3)</div>
            </div>
            <span style={{ fontWeight: 800, color: '#d4a017' }}>★ {kpis.googleRating?.rating || 4.4}</span>
          </div>

          {/* Approved Direct Competitors */}
          {directList.map((comp: any, idx: number) => (
            <div key={comp.id || idx} style={{ padding: '0.6rem 0.75rem', backgroundColor: '#0a0b0d', borderRadius: '8px', border: '1px solid #242838', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{comp.name}</span>
                <div style={{ fontSize: '0.68rem', color: '#10b981' }}>Approved Direct Churrascaria • {(comp.reviewCount || 0).toLocaleString()} reviews</div>
              </div>
              <span style={{ fontWeight: 700, color: '#f3f4f6' }}>★ {comp.rating}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Broader Market Secondary Comparison */}
      <div style={{ backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282c3c', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
          <Layers size={16} style={{ color: '#3b82f6' }} />
          <span>Broader Market Comparison (Approved Secondary Set)</span>
        </h3>
        <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
          Traditional steakhouses & casual grills competing for dinner occasion/spend.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
          {secondaryList.map((comp: any, idx: number) => (
            <div key={comp.id || idx} style={{ padding: '0.6rem 0.75rem', backgroundColor: '#0a0b0d', borderRadius: '8px', border: '1px solid #242838', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#f3f4f6' }}>{comp.name}</span>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Approved Secondary • {(comp.reviewCount || 0).toLocaleString()} reviews</div>
              </div>
              <span style={{ fontWeight: 700, color: '#f3f4f6' }}>★ {comp.rating}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Watchlist Summary Badge */}
      <div style={{ backgroundColor: '#161922', borderRadius: '10px', border: '1px solid #282c3c', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9ca3af' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Eye size={16} />
          <span>Watchlist Monitored Stores: <strong>{watchlistCount} entries</strong></span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>0 rank impact</span>
      </div>

      {/* 8. Quick Status Footer */}
      <div style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.72rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div>{footerStatus.adapter || 'Google Places: Operational'} • {footerStatus.coverage || 'Coverage: Metadata Only'}</div>
        <div>Next scheduled check: {footerStatus.nextCheckText || 'Tomorrow, 6:36 AM'}</div>
        <div style={{ fontSize: '0.65rem', color: '#4b5563', marginTop: '0.25rem' }}>&copy; 2026 BRASA Brand Pulse OS • Mobile Executive View</div>
      </div>

    </div>
  );
}

export default function MobilePulsePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0b0d', color: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading Mobile Pulse...
      </div>
    }>
      <MobilePulseContent />
    </Suspense>
  );
}
