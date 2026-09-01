'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Globe,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  Building,
  Loader2
} from 'lucide-react';

interface MonitoredEntity {
  id: string;
  brandName: string;
  locationName: string;
  city: string;
  state: string;
  address: string;
  entityType: 'OWNED_LOCATION' | 'MONITORED_EXTERNAL' | 'COMPETITOR' | 'COMPETITOR_CANDIDATE';
  monitoringStatus: string;
  googleRating: number | null;
  reviewCount: number | null;
  coverageType: string;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  externalSourceId: string | null;
  placeId: string | null;
  dataSources: Array<{
    id: string;
    provider: string;
    adapterUsed: string | null;
    status: string;
    frequencyMinutes: number;
    lastFetchAt: string | null;
    nextFetchAt: string | null;
    externalId: string | null;
    metadata: any;
  }>;
}

function MonitoredEntitiesContent() {
  const [entities, setEntities] = useState<MonitoredEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/monitored-entities');
      if (res.ok) {
        const data = await res.json();
        setEntities(data.entities || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = entities.filter(ent => {
    const matchesSearch = !searchQuery.trim() ||
      ent.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.state.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || ent.entityType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <div className="flex-between mb-4">
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Globe size={28} style={{ color: '#38bdf8' }} />
                <span>Enterprise Monitored Entities Registry</span>
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: '0.35rem' }}>
                Network-wide registry of owned locations, competitor candidates, and external monitored sources.
              </p>
            </div>

            <button
              onClick={fetchEntities}
              disabled={loading}
              style={{ backgroundColor: '#161922', border: '1px solid #242838', color: '#ffffff', padding: '0.45rem 0.85rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Registry</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Filter by brand, city, state, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.6rem', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: '#c5a880' }} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: '0.6rem 1rem', backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">All Entity Types</option>
                <option value="OWNED_LOCATION">Owned Locations ({entities.filter(e => e.entityType === 'OWNED_LOCATION').length})</option>
                <option value="COMPETITOR">Competitors ({entities.filter(e => e.entityType === 'COMPETITOR').length})</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
              <Loader2 size={32} className="animate-spin text-info" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '3.5rem', textAlign: 'center', color: '#9ca3af' }}>
              <Building size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No monitored entities match your search query.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {filtered.map((ent) => (
                <div key={ent.id} style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem', color: '#ffffff' }}>{ent.brandName}</strong>
                      <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                        {ent.entityType}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e5e7eb' }}>{ent.locationName}</div>
                    <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '0.25rem' }}>{ent.address}, {ent.city}, {ent.state}</div>
                  </div>

                  <div style={{ borderTop: '1px solid #242838', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={14} /> Active
                    </span>
                    <Link href={`/monitored-entities/${ent.id}`} style={{ color: '#c5a880', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Eye size={14} /> View Source
                    </Link>
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

export default function MonitoredEntitiesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Monitored Entities...</div>}>
      <MonitoredEntitiesContent />
    </Suspense>
  );
}
