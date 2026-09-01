'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, ArrowRight, Search, Building2, Globe, Clock, CheckCircle2, Filter, Layers } from 'lucide-react';

export interface LocationCardData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  businessStatus: string;
  verificationStatus: string;
  googlePlaceId: string | null;
  market: string | null;
}

interface LocationsGridProps {
  allLocations?: LocationCardData[];
  selectedLocationId?: string;
}

export default function LocationsGrid({ allLocations = [], selectedLocationId }: LocationsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');

  const safeLocations = Array.isArray(allLocations) ? allLocations : [];

  // Extract all distinct states from the full network
  const allStates = Array.from(new Set(safeLocations.map(l => l.state).filter(Boolean))).sort();

  // Filter locations dynamically based on search query and state selector
  const filtered = safeLocations.filter(loc => {
    const matchesSearch = searchQuery === '' || 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.market && loc.market.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesState = selectedState === 'ALL' || loc.state === selectedState;

    const matchesHeaderFocus = (!selectedLocationId || selectedLocationId === 'ALL' || searchQuery !== '' || selectedState !== 'ALL')
      ? true
      : loc.id === selectedLocationId;

    return matchesSearch && matchesState && matchesHeaderFocus;
  });

  // Group filtered locations by State
  const groupedByState: Record<string, LocationCardData[]> = {};
  filtered.forEach(loc => {
    const st = loc.state || 'OTHER';
    if (!groupedByState[st]) groupedByState[st] = [];
    groupedByState[st].push(loc);
  });

  const displayStates = Object.keys(groupedByState).sort();

  return (
    <div>
      {/* Search & State Filter Control Bar */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search stores by name, city, state, or market..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.6rem',
              backgroundColor: '#0a0b0d',
              border: '1px solid #242838',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: '#c5a880' }} />
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              backgroundColor: '#0a0b0d',
              border: '1px solid #242838',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '220px'
            }}
          >
            <option value="ALL">All States ({allStates.length} States/Territories)</option>
            {allStates.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: 600 }}>
          Showing <span style={{ color: '#10b981', fontWeight: 800 }}>{filtered.length}</span> of {safeLocations.length} Locations
        </div>
      </div>

      {/* Grid of Location Cards Grouped by State */}
      {displayStates.length === 0 ? (
        <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
          <Building2 size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>No locations match your search or state filter criteria.</p>
        </div>
      ) : (
        displayStates.map(state => {
          const stateStores = groupedByState[state];
          return (
            <div key={state} style={{ marginBottom: '2rem' }}>
              {/* State Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #242838', paddingBottom: '0.5rem' }}>
                <Layers size={18} style={{ color: '#c5a880' }} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {state === 'PR' ? 'Puerto Rico (US Territory)' : state === 'Panama' || state === 'Trinidad & Tobago' || state === 'South Korea' ? `${state} (International)` : `State: ${state}`}
                </h2>
                <span style={{ backgroundColor: '#161922', border: '1px solid #242838', color: '#9ca3af', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {stateStores.length} {stateStores.length === 1 ? 'Store' : 'Stores'}
                </span>
              </div>

              {/* Grid of Store Cards for this State */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {stateStores.map(loc => {
                  const isTampa = loc.name.includes('Tampa');
                  const isSelected = selectedLocationId === loc.id;
                  const isComingSoon = loc.businessStatus === 'COMING_SOON';
                  const isTerritory = loc.country === 'Puerto Rico';
                  const isInternational = loc.businessStatus === 'INTERNATIONAL';

                  return (
                    <div
                      key={loc.id}
                      style={{
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : '#161922',
                        border: isSelected ? '2px solid #3b82f6' : isTampa ? '1px solid #c5a880' : '1px solid #242838',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isSelected ? '#38bdf8' : isTampa ? '#c5a880' : '#ffffff' }}>
                            <MapPin size={18} />
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                              {loc.name}
                            </h3>
                          </div>
                        </div>

                        <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '0.35rem 0 0.75rem 0', lineHeight: 1.4 }}>
                          {loc.address}, {loc.city}, {loc.state} {loc.postalCode || ''}
                        </p>

                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                          {isSelected && (
                            <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#38bdf8', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                              ACTIVE SELECTION
                            </span>
                          )}

                          {isTampa && (
                            <span style={{ backgroundColor: 'rgba(197, 168, 128, 0.15)', color: '#c5a880', border: '1px solid rgba(197, 168, 128, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                              POC #1 (33 REVIEWS)
                            </span>
                          )}

                          {isComingSoon && (
                            <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                              COMING SOON
                            </span>
                          )}

                          {isTerritory && (
                            <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                              US TERRITORY (PR)
                            </span>
                          )}

                          {isInternational && (
                            <span style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                              INTERNATIONAL
                            </span>
                          )}

                          {loc.market && (
                            <span style={{ backgroundColor: '#0a0b0d', color: '#9ca3af', border: '1px solid #242838', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem' }}>
                              {loc.market}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #242838', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600 }}>
                          Store 360 Profile
                        </span>
                        <Link
                          href={`/locations/${loc.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#c5a880',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <span>View</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
