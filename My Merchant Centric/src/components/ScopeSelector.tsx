'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Building2, MapPin, ChevronDown, Search, Check, Layers, Eye, ShieldCheck } from 'lucide-react';

interface ScopeEntity {
  id: string;
  brandName: string;
  locationName: string;
  city: string;
  state: string;
  entityType: string;
  verificationStatus?: string;
  businessStatus?: string;
}

interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
  brasaOrganizationId: string | null;
  _count?: { locations: number };
}

function ScopeSelectorContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [entities, setEntities] = useState<ScopeEntity[]>([]);
  const [allDirectoryEntities, setAllDirectoryEntities] = useState<ScopeEntity[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [canSwitchOrg, setCanSwitchOrg] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeBrandName, setActiveBrandName] = useState<string>('Organization');
  const [isExtendedDirectory, setIsExtendedDirectory] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data.organizations || []);
          setCanSwitchOrg(Boolean(data.canSwitchOrganization));
          const current = data.currentOrganizationId || data.organizations?.[0]?.id;
          
          const queryOrg = searchParams.get('organizationId');
          const storedOrg = localStorage.getItem('brasa_selected_org');
          
          // Server query parameter or server session organization ALWAYS takes priority
          let activeOrg = current;
          if (queryOrg) {
            activeOrg = queryOrg;
          } else if (data.canSwitchOrganization && storedOrg) {
            activeOrg = storedOrg;
          }

          setSelectedOrgId(activeOrg);
          localStorage.setItem('brasa_selected_org', activeOrg);

          const currentOrgObj = (data.organizations || []).find((o: any) => o.id === activeOrg);
          if (currentOrgObj) {
            setActiveBrandName(currentOrgObj.name);
          }
        }
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    };

    fetchOrgs();
  }, [searchParams]);

  // Fetch locations for selected organization
  useEffect(() => {
    const queryLoc = searchParams.get('locationId') || searchParams.get('entityId');
    const storedEntity = localStorage.getItem('brasa_selected_entity');
    
    // Server query parameter takes absolute priority over stored entity
    const initialLoc = queryLoc || (storedEntity || 'ALL');
    setSelectedId(initialLoc);
    if (queryLoc) {
      localStorage.setItem('brasa_selected_entity', queryLoc);
    }

    const fetchEntities = async () => {
      try {
        const url = selectedOrgId 
          ? `/api/monitored-entities?organizationId=${selectedOrgId}`
          : '/api/monitored-entities';
          
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const allOwned = (data.entities || []).filter((e: any) => e.entityType === 'OWNED_LOCATION');
          setAllDirectoryEntities(allOwned);

          // Operational mode: MASTER_OPERATIONAL or non-directory-only operational owned locations
          const masterOperational = allOwned.filter((e: any) => 
            e.verificationStatus !== 'PULSE_DIRECTORY_ONLY' &&
            !e.locationName.toLowerCase().includes('coming soon') &&
            !e.locationName.toLowerCase().includes('naples')
          );
          setEntities(masterOperational);

          const orgObj = organizations.find(o => o.id === selectedOrgId);
          if (orgObj) {
            setActiveBrandName(orgObj.name);
          } else if (masterOperational.length > 0) {
            setActiveBrandName(masterOperational[0].brandName || 'Organization');
          }
        }
      } catch (err) {
        console.error('Error fetching scope selector entities:', err);
      }
    };

    if (selectedOrgId) {
      fetchEntities();
    }
  }, [selectedOrgId, searchParams, organizations]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOrgSwitch = (orgId: string) => {
    setSelectedOrgId(orgId);
    setSelectedId('ALL');
    setIsExtendedDirectory(false);
    localStorage.setItem('brasa_selected_org', orgId);
    localStorage.removeItem('brasa_selected_entity');

    const orgObj = organizations.find(o => o.id === orgId);
    if (orgObj) {
      setActiveBrandName(orgObj.name);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('organizationId', orgId);
    params.delete('locationId');
    params.delete('entityId');

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    localStorage.setItem('brasa_selected_entity', id);
    setIsOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    if (selectedOrgId) {
      params.set('organizationId', selectedOrgId);
    }

    if (id === 'ALL') {
      params.delete('locationId');
      params.delete('entityId');
    } else {
      params.set('locationId', id);
      params.set('entityId', id);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const activeList = isExtendedDirectory ? allDirectoryEntities : entities;

  const groupedByState: Record<string, ScopeEntity[]> = {};
  activeList.forEach(ent => {
    const st = ent.state || 'OTHER';
    if (!groupedByState[st]) groupedByState[st] = [];
    groupedByState[st].push(ent);
  });

  const sortedStates = Object.keys(groupedByState).sort();

  const activeEntity = activeList.find(e => e.id === selectedId);
  const activeDisplayTitle = selectedId === 'ALL'
    ? isExtendedDirectory
      ? `${activeBrandName} Extended Directory (${allDirectoryEntities.length} Locations)`
      : `${activeBrandName} Network (${entities.length} Stores)`
    : activeEntity
      ? `${activeEntity.brandName || activeBrandName} - ${activeEntity.locationName} (${activeEntity.state})`
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

        <span style={{ color: '#ffffff', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            width: '440px',
            maxHeight: '560px',
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
          {/* Admin Organization Switcher Bar */}
          {canSwitchOrg && organizations.length > 1 && (
            <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid #242838', backgroundColor: '#1a1e2b' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={13} />
                <span>SELECT ORGANIZATION (ADMIN):</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                {organizations.map(org => {
                  const isSelected = org.id === selectedOrgId;
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleOrgSwitch(org.id)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: isSelected ? 700 : 500,
                        backgroundColor: isSelected ? '#c5a880' : '#0a0b0d',
                        color: isSelected ? '#000000' : '#9ca3af',
                        border: '1px solid',
                        borderColor: isSelected ? '#c5a880' : '#242838',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {org.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search & Directory Mode Bar */}
          <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid #242838', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Search locations or cities..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#181b24',
                  border: '1px solid #242838',
                  borderRadius: '6px',
                  padding: '0.4rem 0.65rem 0.4rem 2rem',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Extended Directory Toggle Bar */}
            {allDirectoryEntities.length > entities.length && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', backgroundColor: '#161922', borderRadius: '6px', border: '1px solid #242838' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={13} style={{ color: '#10b981' }} />
                  {isExtendedDirectory ? `Showing all ${allDirectoryEntities.length} Directory Units` : `Operational Mode (${entities.length} Master Stores)`}
                </span>
                <button
                  onClick={() => setIsExtendedDirectory(!isExtendedDirectory)}
                  style={{
                    backgroundColor: isExtendedDirectory ? '#38bdf8' : '#242838',
                    color: isExtendedDirectory ? '#000000' : '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isExtendedDirectory ? 'Operational Only' : 'Extended Directory'}
                </button>
              </div>
            )}
          </div>

          {/* Location Items List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.4rem' }}>
            {/* ALL Network Option */}
            <div
              onClick={() => handleSelect('ALL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: selectedId === 'ALL' ? '#1f2433' : 'transparent',
                marginBottom: '0.35rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Building2 size={16} style={{ color: selectedId === 'ALL' ? '#c5a880' : '#6b7280' }} />
                <div>
                  <div style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: 600 }}>
                    {activeBrandName} Network
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.72rem' }}>
                    {isExtendedDirectory ? `All ${allDirectoryEntities.length} Directory Locations` : `All ${entities.length} Master Operational Stores`}
                  </div>
                </div>
              </div>
              {selectedId === 'ALL' && <Check size={16} style={{ color: '#c5a880' }} />}
            </div>

            {/* Location Groups by State */}
            {filteredStates.map(st => {
              const stateEntities = groupedByState[st].filter(e => {
                if (!filterText) return true;
                return (
                  st.toLowerCase().includes(filterText) ||
                  e.locationName.toLowerCase().includes(filterText) ||
                  e.city.toLowerCase().includes(filterText)
                );
              });

              if (stateEntities.length === 0) return null;

              return (
                <div key={st} style={{ marginBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', padding: '0.2rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {st} ({stateEntities.length})
                  </div>

                  {stateEntities.map(ent => {
                    const isSelected = ent.id === selectedId;
                    const isDirOnly = ent.verificationStatus === 'PULSE_DIRECTORY_ONLY';

                    return (
                      <div
                        key={ent.id}
                        onClick={() => handleSelect(ent.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.75rem 0.45rem 1.4rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#1f2433' : 'transparent',
                          opacity: isDirOnly ? 0.75 : 1.0,
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={14} style={{ color: isSelected ? '#c5a880' : isDirOnly ? '#eab308' : '#6b7280' }} />
                          <div>
                            <div style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: isSelected ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{ent.locationName}</span>
                              {isDirOnly && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, backgroundColor: '#374151', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                                  DIRECTORY ONLY
                                </span>
                              )}
                            </div>
                            <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                              {ent.city}, {ent.state}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={15} style={{ color: '#c5a880' }} />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScopeSelector() {
  return (
    <Suspense fallback={
      <div style={{ padding: '0.5rem 0.85rem', backgroundColor: '#161922', borderRadius: '8px', color: '#9ca3af', fontSize: '0.84rem' }}>
        Loading location scope...
      </div>
    }>
      <ScopeSelectorContent />
    </Suspense>
  );
}
