'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Building2, MapPin, ChevronDown, Search, Check } from 'lucide-react';

interface ScopeEntity {
  id: string;
  brandName: string;
  locationName: string;
  city: string;
  state: string;
  entityType: string;
}

function ScopeSelectorContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [entities, setEntities] = useState<ScopeEntity[]>([]);
  const [selectedId, setSelectedId] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const queryLoc = searchParams.get('locationId') || searchParams.get('entityId');
    const storedEntity = localStorage.getItem('brasa_selected_entity');
    const initialLoc = queryLoc || storedEntity || 'ALL';
    setSelectedId(initialLoc);

    const fetchEntities = async () => {
      try {
        const res = await fetch('/api/monitored-entities');
        if (res.ok) {
          const data = await res.json();
          const owned = (data.entities || []).filter((e: any) => e.entityType === 'OWNED_LOCATION');
          setEntities(owned);
        }
      } catch (err) {
        console.error('Error fetching scope selector entities:', err);
      }
    };

    fetchEntities();
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    localStorage.setItem('brasa_selected_entity', id);
    setIsOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    if (id === 'ALL') {
      params.delete('locationId');
      params.delete('entityId');
    } else {
      params.set('locationId', id);
      params.set('entityId', id);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const groupedByState: Record<string, ScopeEntity[]> = {};
  entities.forEach(ent => {
    const st = ent.state || 'OTHER';
    if (!groupedByState[st]) groupedByState[st] = [];
    groupedByState[st].push(ent);
  });

  const sortedStates = Object.keys(groupedByState).sort();

  const activeEntity = entities.find(e => e.id === selectedId);
  const activeDisplayTitle = selectedId === 'ALL'
    ? 'Texas de Brazil Enterprise Network (All 62 Stores)'
    : activeEntity
      ? `${activeEntity.locationName} (${activeEntity.state})`
      : 'Selected Location';

  const filterText = searchFilter.toLowerCase().trim();
  const filteredStates = sortedStates.filter(st => {
    if (!filterText) return true;
    if (st.toLowerCase().includes(filterText)) return true;
    return groupedByState[st].some(e => 
      e.locationName.toLowerCase().includes(filterText) || 
      e.city.toLowerCase().includes(filterText)
    );
  });

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          backgroundColor: '#161922',
          border: '1px solid #242838',
          borderRadius: '8px',
          padding: '0.5rem 0.85rem',
          color: '#ffffff',
          fontSize: '0.84rem',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(197, 168, 128, 0.4)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <span style={{ color: '#c5a880', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Analyzing:
        </span>

        <span style={{ color: '#ffffff', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeDisplayTitle}
        </span>

        <ChevronDown size={16} style={{ color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '380px',
            maxHeight: '480px',
            backgroundColor: '#12141c',
            border: '1px solid #242838',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '0.85rem', borderBottom: '1px solid #242838', backgroundColor: '#161922' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Filter states, cities, or stores..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                  backgroundColor: '#0a0b0d',
                  border: '1px solid #242838',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
            <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', borderBottom: '1px solid #242838', marginBottom: '0.5rem' }}>
              <button
                onClick={() => handleSelect('ALL')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.75rem',
                  backgroundColor: selectedId === 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: selectedId === 'ALL' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: selectedId === 'ALL' ? '#38bdf8' : '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Building2 size={16} style={{ color: '#3b82f6' }} />
                  <div>
                    <div>Texas de Brazil Network</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 400 }}>All 62 Stores (Organization-Wide)</div>
                  </div>
                </div>
                {selectedId === 'ALL' && <Check size={16} style={{ color: '#38bdf8' }} />}
              </button>
            </div>

            {filteredStates.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
                No stores found matching &quot;{searchFilter}&quot;
              </div>
            ) : (
              filteredStates.map(state => {
                const stateStores = groupedByState[state].filter(e => {
                  if (!filterText) return true;
                  return e.locationName.toLowerCase().includes(filterText) ||
                         e.city.toLowerCase().includes(filterText) ||
                         state.toLowerCase().includes(filterText);
                });

                if (stateStores.length === 0) return null;

                return (
                  <div key={state} style={{ marginBottom: '0.65rem' }}>
                    <div
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#c5a880',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>STATE: {state}</span>
                      <span style={{ backgroundColor: '#161922', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#9ca3af', fontSize: '0.62rem' }}>
                        {stateStores.length} {stateStores.length === 1 ? 'store' : 'stores'}
                      </span>
                    </div>

                    <div style={{ padding: '0 0.5rem' }}>
                      {stateStores.map(store => {
                        const isStoreSelected = selectedId === store.id;
                        return (
                          <button
                            key={store.id}
                            onClick={() => handleSelect(store.id)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: isStoreSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                              border: isStoreSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                              borderRadius: '6px',
                              color: isStoreSelected ? '#38bdf8' : '#e5e7eb',
                              fontSize: '0.82rem',
                              fontWeight: isStoreSelected ? 700 : 500,
                              cursor: 'pointer',
                              textAlign: 'left',
                              marginTop: '0.15rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <MapPin size={14} style={{ color: isStoreSelected ? '#38bdf8' : '#9ca3af' }} />
                              <span>{store.locationName}</span>
                            </div>

                            {isStoreSelected && <Check size={14} style={{ color: '#38bdf8' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScopeSelector() {
  return (
    <Suspense fallback={<div style={{ color: '#ffffff' }}>Loading Selector...</div>}>
      <ScopeSelectorContent />
    </Suspense>
  );
}
