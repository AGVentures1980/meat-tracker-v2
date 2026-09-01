'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Star,
  Info,
  ShieldCheck,
  Building2,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';

interface CompetitorMember {
  id: string;
  matchScore: number;
  tier: string;
  status: string;
  competitiveRole: string;
  proposedTier?: string;
  cuisineSimilarity?: string;
  serviceModelSimilarity?: string;
  occasionSimilarity?: string;
  pricePositioningSimilarity?: string;
  marketRelevance?: string;
  distanceMiles?: number;
  explanation?: string;
  approvedByUser: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  competitor: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    googlePlaceId?: string;
    googleRating?: number;
    userRatingCount?: number;
    businessStatus?: string;
    primaryCategory?: string;
    brand: {
      name: string;
    };
  };
}

interface BenchmarkMetrics {
  totalBenchmarkParticipants: number;
  primaryCount: number;
  broaderCount: number;
  watchlistCount: number;
  marketAvgRating: number;
  marketAvgReviews: number;
}

function CompetitorsContent() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');

  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  
  const [primaryCompetitors, setPrimaryCompetitors] = useState<CompetitorMember[]>([]);
  const [broaderMarket, setBroaderMarket] = useState<CompetitorMember[]>([]);
  const [watchlist, setWatchlist] = useState<CompetitorMember[]>([]);
  const [pendingDiscovery, setPendingDiscovery] = useState<CompetitorMember[]>([]);
  const [benchmarkMetrics, setBenchmarkMetrics] = useState<BenchmarkMetrics | null>(null);
  const [noDirectCompetitors, setNoDirectCompetitors] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'PRIMARY' | 'BROADER' | 'WATCHLIST' | 'DISCOVERY'>('PRIMARY');

  useEffect(() => {
    fetchCompetitors();
  }, [locationId]);

  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      if (!locationId || locationId === 'ALL') {
        setLocationName('Texas de Brazil Enterprise Network');
        setPrimaryCompetitors([]);
        setBroaderMarket([]);
        setWatchlist([]);
        setPendingDiscovery([]);
        setBenchmarkMetrics(null);
        setLoading(false);
        return;
      }

      // Fetch location name
      const locRes = await fetch('/api/locations');
      if (locRes.ok) {
        const locs = await locRes.json();
        const matched = locs.find((l: any) => l.id === locationId);
        if (matched) setLocationName(matched.name);
      }

      const res = await fetch(`/api/integrations/competitors?locationId=${locationId}`);
      if (res.ok) {
        const data = await res.json();
        setPrimaryCompetitors(data.primaryCompetitors || []);
        setBroaderMarket(data.broaderMarket || []);
        setWatchlist(data.watchlist || []);
        setPendingDiscovery(data.pendingDiscovery || []);
        setBenchmarkMetrics(data.benchmarkMetrics || null);
        setNoDirectCompetitors(data.noDirectCompetitors || false);
      }
    } catch (e) {
      console.error('Error fetching competitors:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiscovery = async () => {
    if (!locationId || locationId === 'ALL') return;
    setDiscovering(true);
    try {
      const res = await fetch('/api/integrations/scout/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      });
      if (res.ok) {
        await fetchCompetitors();
      }
    } catch (e) {
      console.error('Error running discovery:', e);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAction = async (memberId: string, action: 'MOVE_PRIMARY' | 'MOVE_BROADER' | 'MOVE_WATCHLIST' | 'REJECT') => {
    try {
      const res = await fetch('/api/integrations/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, action }),
      });
      if (res.ok) {
        await fetchCompetitors();
      }
    } catch (e) {
      console.error('Error processing competitor action:', e);
    }
  };

  const getDisplayedList = () => {
    switch (activeTab) {
      case 'PRIMARY':
        return primaryCompetitors;
      case 'BROADER':
        return broaderMarket;
      case 'WATCHLIST':
        return watchlist;
      case 'DISCOVERY':
        return pendingDiscovery;
      default:
        return primaryCompetitors;
    }
  };

  const displayedList = getDisplayedList();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header Banner */}
          <div className="flex-between">
            <div>
              <h1 className="page-title flex-align" style={{ gap: '0.5rem' }}>
                <Building2 className="text-warning" size={26} />
                <span>Your Competitive Market</span>
              </h1>
              <p className="page-subtitle">
                {locationName ? `Competitive market positioning & trade area intelligence for ${locationName}.` : 'Multi-location competitive market positioning.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleRunDiscovery}
                disabled={discovering || !locationId || locationId === 'ALL'}
                className="btn btn-primary flex-align"
                style={{ gap: '0.5rem' }}
              >
                <RefreshCw size={14} className={discovering ? 'animate-spin' : ''} />
                <span>{discovering ? 'Searching Trade Area...' : 'Run Trade Area Discovery'}</span>
              </button>
            </div>
          </div>

          {/* Active Location Scope & Benchmark Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Card 1: Benchmark Set */}
            <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1.15rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={16} style={{ color: '#38bdf8' }} />
                <span>BENCHMARK PARTICIPANTS</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '0.4rem' }}>
                {benchmarkMetrics ? benchmarkMetrics.totalBenchmarkParticipants : 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                {primaryCompetitors.length} Primary • {broaderMarket.length} Broader
              </div>
            </div>

            {/* Card 2: Market Avg Rating */}
            <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1.15rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Star size={16} style={{ color: '#f59e0b' }} />
                <span>MARKET AVG RATING</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.4rem' }}>
                {benchmarkMetrics?.marketAvgRating ? `${benchmarkMetrics.marketAvgRating}★` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                Approved benchmark average
              </div>
            </div>

            {/* Card 3: Market Avg Reviews */}
            <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1.15rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={16} style={{ color: '#10b981' }} />
                <span>AVG REVIEW VOLUME</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '0.4rem' }}>
                {benchmarkMetrics?.marketAvgReviews ? benchmarkMetrics.marketAvgReviews.toLocaleString() : 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                Reviews per benchmark store
              </div>
            </div>

            {/* Card 4: Discovery Universe */}
            <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1.15rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} style={{ color: '#c5a880' }} />
                <span>DISCOVERY UNIVERSE</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c5a880', marginTop: '0.4rem' }}>
                {pendingDiscovery.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                Candidates pending review
              </div>
            </div>
          </div>

          {/* Location Notice Bar */}
          {noDirectCompetitors && activeTab === 'PRIMARY' && (
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} />
              <span>Notice: No qualified Primary Competitor currently designated for this trade area. Competitors may be assigned from Broader Market or Discovery Candidates below.</span>
            </div>
          )}

          {/* User-Facing Competitor Group Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #242838', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('PRIMARY')}
              style={{
                backgroundColor: activeTab === 'PRIMARY' ? '#242838' : 'transparent',
                color: activeTab === 'PRIMARY' ? '#ffffff' : '#9ca3af',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: '6px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>Primary Competitors</span>
              <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.72rem' }}>
                {primaryCompetitors.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('BROADER')}
              style={{
                backgroundColor: activeTab === 'BROADER' ? '#242838' : 'transparent',
                color: activeTab === 'BROADER' ? '#ffffff' : '#9ca3af',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: '6px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>Broader Market</span>
              <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.72rem' }}>
                {broaderMarket.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('WATCHLIST')}
              style={{
                backgroundColor: activeTab === 'WATCHLIST' ? '#242838' : 'transparent',
                color: activeTab === 'WATCHLIST' ? '#ffffff' : '#9ca3af',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: '6px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>Watchlist</span>
              <span style={{ backgroundColor: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.72rem' }}>
                {watchlist.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DISCOVERY')}
              style={{
                backgroundColor: activeTab === 'DISCOVERY' ? '#242838' : 'transparent',
                color: activeTab === 'DISCOVERY' ? '#ffffff' : '#c5a880',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: '6px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Sparkles size={14} />
              <span>Explore Broader Market</span>
              <span style={{ backgroundColor: 'rgba(197, 168, 128, 0.2)', color: '#c5a880', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.72rem' }}>
                {pendingDiscovery.length}
              </span>
            </button>
          </div>

          {/* Tab Description Context */}
          <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
            {activeTab === 'PRIMARY' && 'Core direct churrascaria and rodizio competitors used for primary competitive comparison.'}
            {activeTab === 'BROADER' && 'Steakhouses competing for similar occasion spend, business dining, celebrations, and premium steak demand.'}
            {activeTab === 'WATCHLIST' && 'Relevant businesses monitored for market surveillance (Excluded from official benchmark calculations).'}
            {activeTab === 'DISCOVERY' && 'Discovered trade area candidates pending human approval for benchmark inclusion.'}
          </div>

          {/* Cards Grid */}
          {displayedList.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px' }}>
              <Building2 size={40} style={{ margin: '0 auto 1rem', color: '#9ca3af', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                {activeTab === 'PRIMARY' && 'No Primary Competitors Assigned'}
                {activeTab === 'BROADER' && 'No Broader Market Competitors Assigned'}
                {activeTab === 'WATCHLIST' && 'No Watchlist Businesses Added'}
                {activeTab === 'DISCOVERY' && 'No Discovered Candidates Pending Review'}
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
                {activeTab === 'DISCOVERY'
                  ? 'Run Trade Area Discovery above to search for local Brazilian and premium steakhouse competitors.'
                  : 'Select "Explore Broader Market" tab to review candidates and assign them to Primary, Broader Market, or Watchlist.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {displayedList.map(item => {
                const comp = item.competitor;
                const aiProposal = item.proposedTier ? item.proposedTier.replace('_CANDIDATE', '') : 'AI PROPOSAL';
                const userRole = item.competitiveRole || (item.tier === 'DIRECT' ? 'PRIMARY' : 'BROADER');

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#161922',
                      border: '1px solid #242838',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Top Bar: Name & Group Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{comp.name}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#c5a880', fontWeight: 600 }}>
                            Brand: {comp.brand.name}
                          </div>
                        </div>

                        <span
                          style={{
                            backgroundColor: activeTab === 'PRIMARY' ? 'rgba(59, 130, 246, 0.15)' : activeTab === 'BROADER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                            color: activeTab === 'PRIMARY' ? '#38bdf8' : activeTab === 'BROADER' ? '#f59e0b' : '#9ca3af',
                            border: `1px solid ${activeTab === 'PRIMARY' ? 'rgba(59, 130, 246, 0.3)' : activeTab === 'BROADER' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}
                        >
                          {activeTab === 'DISCOVERY' ? `AI SUGGESTED: ${aiProposal}` : userRole}
                        </span>
                      </div>

                      {/* Location & Metadata */}
                      <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>📍 {comp.address}</div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                          <span>📏 <strong>{item.distanceMiles || 'N/A'} mi</strong> away</span>
                          {comp.googleRating && (
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                              ★ {comp.googleRating} ({comp.userRatingCount ? comp.userRatingCount.toLocaleString() : 0} reviews)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Factual Dimensional Breakdown */}
                      <div style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '0.75rem', fontSize: '0.76rem', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#e5e7eb', marginBottom: '0.35rem' }}>Factual Market Evidence:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', color: '#9ca3af' }}>
                          <div>Cuisine: <strong style={{ color: '#ffffff' }}>{item.cuisineSimilarity || 'MEDIUM'}</strong></div>
                          <div>Service: <strong style={{ color: '#ffffff' }}>{item.serviceModelSimilarity || 'HIGH'}</strong></div>
                          <div>Occasion: <strong style={{ color: '#ffffff' }}>{item.occasionSimilarity || 'HIGH'}</strong></div>
                          <div>Price: <strong style={{ color: '#ffffff' }}>{item.pricePositioningSimilarity || 'HIGH'}</strong></div>
                        </div>

                        {/* Audit trail indicator preserving internal AI proposal */}
                        {item.proposedTier && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: '#6b7280' }}>
                            AI Audit Proposal: {item.proposedTier}
                          </div>
                        )}

                        {comp.googlePlaceId && (
                          <div style={{ marginTop: '0.4rem', color: '#10b981', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ShieldCheck size={12} /> Authentic Google Place ID Verified
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Human Action Reassignment Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', borderTop: '1px solid #242838', paddingTop: '0.75rem' }}>
                      <button
                        onClick={() => handleAction(item.id, 'MOVE_PRIMARY')}
                        disabled={item.status === 'APPROVED' && item.competitiveRole === 'DIRECT'}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#38bdf8',
                          borderColor: 'rgba(56, 189, 248, 0.4)',
                          opacity: item.status === 'APPROVED' && item.competitiveRole === 'DIRECT' ? 0.5 : 1
                        }}
                      >
                        Primary
                      </button>

                      <button
                        onClick={() => handleAction(item.id, 'MOVE_BROADER')}
                        disabled={item.status === 'APPROVED' && item.competitiveRole === 'SECONDARY'}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#f59e0b',
                          borderColor: 'rgba(245, 158, 11, 0.4)',
                          opacity: item.status === 'APPROVED' && item.competitiveRole === 'SECONDARY' ? 0.5 : 1
                        }}
                      >
                        Broader
                      </button>

                      <button
                        onClick={() => handleAction(item.id, 'MOVE_WATCHLIST')}
                        disabled={item.status === 'APPROVED' && item.competitiveRole === 'WATCHLIST'}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#9ca3af',
                          opacity: item.status === 'APPROVED' && item.competitiveRole === 'WATCHLIST' ? 0.5 : 1
                        }}
                      >
                        Watchlist
                      </button>

                      <button
                        onClick={() => handleAction(item.id, 'REJECT')}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', fontWeight: 600, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CompetitorsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Competitive Market...</div>}>
      <CompetitorsContent />
    </Suspense>
  );
}
