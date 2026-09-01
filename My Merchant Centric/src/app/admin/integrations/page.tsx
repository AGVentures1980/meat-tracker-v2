'use client';

import { useEffect, useState, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Sparkles,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Link2,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Info,
  MapPin,
} from 'lucide-react';

interface GoogleStatus {
  status: 'READY_FOR_CREDENTIALS' | 'AUTHORIZED' | 'API_ACCESS_REQUIRED' | 'CONNECTED' | 'ERROR';
  mockMode: boolean;
  allowResponsePublishing: boolean;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  errorState: string | null;
  accountId: string | null;
}

interface DiscoveredAccount {
  name: string;
  displayName: string;
  type: string;
}

interface DiscoveredLocation {
  name: string;
  title: string;
  storefrontAddress: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
  };
  phone: string;
  website: string;
  categories: { displayName: string }[];
  matchedLocationId?: string;
  matchConfidence?: number;
}

interface BrasaLocation {
  id: string;
  name: string;
  city: string;
}

interface SyncLog {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  itemsFetched: number;
  itemsCreated: number;
  itemsUpdated: number;
  failures: number;
  errorSummary: string | null;
}

interface MonitoredQuery {
  id: string;
  queryType: string;
  queryText: string;
}

interface CompetitorSuggestion {
  id: string;
  competitorName: string;
  segment: string;
  cuisine: string;
  serviceModel: string;
  priceTier: string;
  geography: string;
  matchScore: number;
  status: string;
}

function AdminIntegrationsContent() {
  const [orgId, setOrgId] = useState<string>('');
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [accounts, setAccounts] = useState<DiscoveredAccount[]>([]);
  const [locations, setLocations] = useState<DiscoveredLocation[]>([]);
  const [brasaLocations, setBrasaLocations] = useState<BrasaLocation[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [queries, setQueries] = useState<MonitoredQuery[]>([]);
  const [competitorSuggestions, setCompetitorSuggestions] = useState<CompetitorSuggestion[]>([]);
  
  // Form states
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [mappingSelection, setMappingSelection] = useState<Record<string, string>>({});
  const [newQueryText, setNewQueryText] = useState<string>('');
  const [newQueryType, setNewQueryType] = useState<string>('BRAND');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('brasa_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const orgIdVal = u.organizationId || u.organization?.id;
        if (orgIdVal) {
          setOrgId(orgIdVal);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Fallback: discover organizationId from /api/locations if localStorage is empty
    const discoverOrg = async () => {
      try {
        const res = await fetch('/api/locations');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setOrgId(data[0].organizationId);
            localStorage.setItem('brasa_user', JSON.stringify({
              organizationId: data[0].organizationId,
              name: 'Admin User',
              email: 'admin@brasabrandpulse.com',
              roles: ['ADMIN']
            }));
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    discoverOrg();
  }, []);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    setActionError(null);
    try {
      // 1. Get Google integration status
      const statusRes = await fetch(`/api/integrations/sync?action=GET_STATUS&organizationId=${orgId}`);
      if (statusRes.ok) {
        const statusData: GoogleStatus = await statusRes.json();
        setGoogleStatus(statusData);
        setSelectedAccountId(statusData.accountId || '');

        // Fetch accounts if authorized/connected
        if (statusData.status !== 'READY_FOR_CREDENTIALS') {
          const accRes = await fetch(`/api/integrations/sync?action=DISCOVER_ACCOUNTS&organizationId=${orgId}`);
          if (accRes.ok) {
            const accData = await accRes.json();
            setAccounts(accData);
          }
        }

        // Fetch locations if account selected
        if (statusData.accountId) {
          const locRes = await fetch(`/api/integrations/sync?action=DISCOVER_LOCATIONS&organizationId=${orgId}`);
          if (locRes.ok) {
            const locData = await locRes.json();
            setLocations(locData);
          }
        }
      }

      // 2. Fetch local BRASA locations
      let localLocs: BrasaLocation[] = [];
      const brasaLocRes = await fetch('/api/locations');
      if (brasaLocRes.ok) {
        localLocs = await brasaLocRes.json();
        setBrasaLocations(localLocs);
      }

      // 3. Fetch mappings
      // We will match automatically or read mapped IDs

      // 4. Fetch Sync History
      const historyRes = await fetch(`/api/integrations/sync?action=SYNC_HISTORY&organizationId=${orgId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setSyncHistory(historyData);
      }

      // 5. Fetch Monitored Queries
      const queriesRes = await fetch(`/api/integrations/queries?organizationId=${orgId}`);
      if (queriesRes.ok) {
        const queriesData = await queriesRes.json();
        setQueries(queriesData);
      }

      // 6. Fetch Competitor Suggestions
      if (localLocs.length > 0) {
        const activeLoc = localLocs[0];
        if (activeLoc) {
          const compRes = await fetch(`/api/integrations/competitors?organizationId=${orgId}&locationId=${activeLoc.id}`);
          if (compRes.ok) {
            const compData = await compRes.json();
            setCompetitorSuggestions(compData);
          }
        }
      }
    } catch (e: any) {
      setActionError(e.message || 'Failed to fetch integration metadata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  const handleConnect = (mock: boolean) => {
    window.location.href = `/api/integrations/google/auth?organizationId=${orgId}&mock=${mock}`;
  };

  const handleSelectAccount = async (accId: string) => {
    setSelectedAccountId(accId);
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELECT_ACCOUNT',
          organizationId: orgId,
          accountId: accId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save selected account');
      }

      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleMapLocation = async (googleLocName: string, brasaLocId: string) => {
    if (!brasaLocId) return;
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MAP_LOCATION',
          organizationId: orgId,
          externalEntityId: googleLocName,
          locationId: brasaLocId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to link location mapping');
      }

      setMappingSelection(prev => ({ ...prev, [googleLocName]: brasaLocId }));
      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleUnmapLocation = async (googleLocName: string) => {
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UNMAP_LOCATION',
          organizationId: orgId,
          externalEntityId: googleLocName,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to unmap location');
      }

      setMappingSelection(prev => {
        const copy = { ...prev };
        delete copy[googleLocName];
        return copy;
      });
      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleTogglePublishing = async (currentVal: boolean) => {
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_PUBLISHING',
          organizationId: orgId,
          allowResponsePublishing: !currentVal,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update publishing policy');
      }

      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect and switch to Live API Mode? This will clear credentials/simulated data.')) return;
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISCONNECT',
          organizationId: orgId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to disconnect integration');
      }

      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC',
          organizationId: orgId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Review synchronization failed');
      }

      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueryText.trim()) return;
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          queryType: newQueryType,
          queryText: newQueryText,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save query');
      }

      setNewQueryText('');
      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleDeleteQuery = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/integrations/queries?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete query');
      }

      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleCompetitorAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionError(null);
    try {
      const res = await fetch('/api/integrations/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: id,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update competitor suggestion');
      }

      fetchData();
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const getMatchConfidence = (gTitle: string, bLocs: BrasaLocation[]): { locId: string; confidence: number } => {
    let bestLocId = '';
    let bestScore = 0;
    
    bLocs.forEach(loc => {
      const cleanGoogle = gTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanBrasa = loc.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (cleanGoogle.includes(cleanBrasa) || cleanBrasa.includes(cleanGoogle)) {
        bestLocId = loc.id;
        bestScore = 95;
      }
    });

    return { locId: bestLocId, confidence: bestScore };
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />

        <main className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {actionError && (
            <div className="card flex-align" style={{ borderColor: 'var(--accent-red)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
              <AlertTriangle className="text-negative" size={20} />
              <div style={{ marginLeft: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {actionError === 'READY FOR GOOGLE CREDENTIALS / API ACCESS' ? (
                  <div>
                    <span style={{ color: 'var(--accent-gold)' }}>Integration Initialized: Ready for live credentials.</span>
                    <p style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      To connect live, enable the <strong>Google Business Profile API</strong> and <strong>My Business Business Information API</strong> in your Google Cloud Console project, configure OAuth Consent, and add redirect URI: <code>http://localhost:3001/api/integrations/google/callback</code>.
                    </p>
                  </div>
                ) : (
                  actionError
                )}
              </div>
            </div>
          )}

          {googleStatus?.mockMode && (
            <div className="card flex-between" style={{ borderColor: 'var(--accent-gold)', backgroundColor: 'rgba(197, 168, 128, 0.05)', padding: '0.75rem 1.25rem' }}>
              <div className="flex-align">
                <Info className="text-warning" size={18} />
                <span className="font-semibold text-warning" style={{ marginLeft: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                  Mock / Demo Simulation Mode Active
                </span>
              </div>
              <div className="flex-align" style={{ gap: '1rem' }}>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Ingested reviews will use provenance marker DEMO.</span>
                <button onClick={handleDisconnect} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: 'var(--accent-gold)', borderColor: 'rgba(197,168,128,0.3)', cursor: 'pointer' }}>
                  Switch to Live Mode
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex-align" style={{ justifyContent: 'center', height: '200px' }}>
              <Loader2 className="animate-spin text-positive" size={32} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
              
              {/* Integration Status Panel */}
              <div className="card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="flex-between">
                  <h3 className="card-title flex-align">
                    <Link2 className="text-positive" size={20} />
                    <span>Google Business Profile API Setup</span>
                  </h3>
                  {googleStatus && (
                    <span className={`badge badge-${googleStatus.status.toLowerCase() === 'connected' ? 'excellent' : googleStatus.status.toLowerCase() === 'authorized' ? 'healthy' : 'critical'}`}>
                      {googleStatus.status}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Onboarding Status</span>
                    {googleStatus?.status === 'READY_FOR_CREDENTIALS' && (
                      <div className="mt-1" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleConnect(false)}
                          disabled={googleStatus?.mockMode}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          {googleStatus?.mockMode ? 'Switch to Live Mode first' : 'Connect Live API'}
                        </button>
                        <button onClick={() => handleConnect(true)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                          Launch Mock Mode
                        </button>
                      </div>
                    )}
                    {googleStatus && googleStatus.status !== 'READY_FOR_CREDENTIALS' && (
                      <div className="mt-1 flex-align" style={{ gap: '0.5rem' }}>
                        <button onClick={handleDisconnect} className="btn btn-secondary" style={{ color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.2)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                          Disconnect
                        </button>
                        <button onClick={handleSyncNow} disabled={syncing} className="btn btn-primary flex-align" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.35rem' }}>
                          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          <span>Sync Now</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Publishing Permissions</span>
                    <div className="flex-align mt-1" style={{ gap: '0.5rem', cursor: 'pointer' }} onClick={() => googleStatus && handleTogglePublishing(googleStatus.allowResponsePublishing)}>
                      {googleStatus?.allowResponsePublishing ? (
                        <ToggleRight className="text-positive" size={28} />
                      ) : (
                        <ToggleLeft className="text-muted" size={28} />
                      )}
                      <span style={{ fontSize: '0.85rem' }}>
                        {googleStatus?.allowResponsePublishing ? 'Publishing Authorized' : 'Suggested Mode Only (Default)'}
                      </span>
                    </div>
                  </div>
                </div>

                {accounts.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Discovered Accounts</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => handleSelectAccount(e.target.value)}
                      className="form-input mt-1"
                      style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                    >
                      <option value="">Select Google Brand Account / Group...</option>
                      {accounts.map(acc => (
                        <option key={acc.name} value={acc.name}>
                          {acc.displayName} ({acc.type}) - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Other Providers Grid */}
              <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="card-title">Available Channels</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="flex-between" style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Yelp</strong>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>API Sync reviews</div>
                    </div>
                    <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>REQUIRES PARTNER</span>
                  </div>
                  <div className="flex-between" style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>TripAdvisor</strong>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>Reputation insights</div>
                    </div>
                    <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>REQUIRES CREDENTIALS</span>
                  </div>
                  <div className="flex-between" style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Social Listening</strong>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>Reddit, X, TikTok</div>
                    </div>
                    <span className="badge badge-watch" style={{ fontSize: '0.65rem' }}>NOT CONFIG</span>
                  </div>
                </div>
              </div>

              {/* Location Mapping Grid */}
              {locations.length > 0 && (
                <div className="card" style={{ gridColumn: 'span 12' }}>
                  <h3 className="card-title flex-align">
                    <MapPin size={18} className="text-warning" />
                    <span>Location Mapping & Auto-Match Discovery</span>
                  </h3>
                  <div className="mt-4" style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Google Location</th>
                          <th>Street Address</th>
                          <th>Primary Phone</th>
                          <th>Match Status / Confidence</th>
                          <th>BRASA Target Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((loc) => {
                          const selectedMappedId = mappingSelection[loc.name] || '';
                          const autoMatch = getMatchConfidence(loc.title, brasaLocations);

                          return (
                            <tr key={loc.name}>
                              <td>
                                <strong style={{ fontSize: '0.85rem' }}>{loc.title}</strong>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>ID: {loc.name}</div>
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>
                                {loc.storefrontAddress.addressLines?.join(', ')}, {loc.storefrontAddress.locality}
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>{loc.phone || 'N/A'}</td>
                              <td>
                                {selectedMappedId ? (
                                  <span className="text-positive font-semibold flex-align" style={{ gap: '0.25rem', fontSize: '0.8rem' }}>
                                    <CheckCircle size={14} /> Confirmed (100%)
                                  </span>
                                ) : autoMatch.locId ? (
                                  <span className="text-warning font-semibold flex-align" style={{ gap: '0.25rem', fontSize: '0.8rem' }}>
                                    <TrendingUp size={14} /> Auto-Match ({autoMatch.confidence}%)
                                  </span>
                                ) : (
                                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Unmapped</span>
                                )}
                              </td>
                              <td>
                                {selectedMappedId ? (
                                  <div className="flex-align" style={{ gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                      {brasaLocations.find(bl => bl.id === selectedMappedId)?.name}
                                    </span>
                                    <button onClick={() => handleUnmapLocation(loc.name)} className="text-negative" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                                      Unlink
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex-align" style={{ gap: '0.5rem' }}>
                                    <select
                                      value={selectedMappedId}
                                      onChange={(e) => handleMapLocation(loc.name, e.target.value)}
                                      className="form-input"
                                      style={{ fontSize: '0.8rem', padding: '0.25rem' }}
                                    >
                                      <option value="">Map Location...</option>
                                      {brasaLocations.map(bl => (
                                        <option key={bl.id} value={bl.id}>
                                          {bl.name} ({bl.city})
                                        </option>
                                      ))}
                                    </select>
                                    {autoMatch.locId && !selectedMappedId && (
                                      <button onClick={() => handleMapLocation(loc.name, autoMatch.locId)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                        Accept Match
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Competitor Discovery suggestions */}
              <div className="card" style={{ gridColumn: 'span 7' }}>
                <h3 className="card-title flex-align">
                  <Sparkles className="text-positive" size={18} />
                  <span>Competitor Discovery Suggestions</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', overflowY: 'auto', maxHeight: '350px' }}>
                  {competitorSuggestions.filter(s => s.status === 'SUGGESTED').length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>No competitor discovery suggestions available.</p>
                  ) : (
                    competitorSuggestions.filter(s => s.status === 'SUGGESTED').map((s) => (
                      <div key={s.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>{s.competitorName}</strong>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {s.segment} • {s.priceTier} • {s.serviceModel} • {s.geography}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '0.25rem', fontWeight: 600 }}>
                            Confidence Match: {s.matchScore}%
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => handleCompetitorAction(s.id, 'APPROVED')} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            Approve
                          </button>
                          <button onClick={() => handleCompetitorAction(s.id, 'REJECTED')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Monitored Queries configuration */}
              <div className="card" style={{ gridColumn: 'span 5' }}>
                <h3 className="card-title">Brand Listening Queries</h3>
                <form onSubmit={handleAddQuery} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <select value={newQueryType} onChange={(e) => setNewQueryType(e.target.value)} className="form-input" style={{ width: '100px', fontSize: '0.8rem', padding: '0.3rem' }}>
                    <option value="BRAND">Brand</option>
                    <option value="MENU">Menu Item</option>
                    <option value="COMPETITOR">Competitor</option>
                  </select>
                  <input
                    type="text"
                    value={newQueryText}
                    onChange={(e) => setNewQueryText(e.target.value)}
                    placeholder="E.g. Filet Mignon"
                    className="form-input"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.3rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                    Add
                  </button>
                </form>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  {queries.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>No monitored query terms added yet.</p>
                  ) : (
                    queries.map((q) => (
                      <span key={q.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{q.queryType}:</span>
                        <span>{q.queryText}</span>
                        <Trash2 onClick={() => handleDeleteQuery(q.id)} size={12} className="text-negative" style={{ cursor: 'pointer', marginLeft: '0.15rem' }} />
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Synchronization History Panel */}
              <div className="card" style={{ gridColumn: 'span 12' }}>
                <h3 className="card-title flex-align">
                  <RefreshCw size={18} className="text-positive" />
                  <span>Sync Ingestion Log History</span>
                </h3>
                <div className="mt-4" style={{ overflowX: 'auto' }}>
                  {syncHistory.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>No synchronization logs recorded yet.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Status</th>
                          <th>Fetched</th>
                          <th>Created</th>
                          <th>Updated</th>
                          <th>Error Diagnostics</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncHistory.map((log) => (
                          <tr key={log.id}>
                            <td style={{ fontSize: '0.8rem' }}>{new Date(log.startedAt).toLocaleString()}</td>
                            <td style={{ fontSize: '0.8rem' }}>{log.completedAt ? new Date(log.completedAt).toLocaleString() : 'Running...'}</td>
                            <td>
                              <span className={`badge badge-${log.status.toLowerCase() === 'success' ? 'excellent' : log.status.toLowerCase() === 'running' ? 'healthy' : 'critical'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem' }}>{log.itemsFetched}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-positive)', fontWeight: 600 }}>+{log.itemsCreated}</td>
                            <td style={{ fontSize: '0.8rem' }}>{log.itemsUpdated}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>
                              {log.errorSummary || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default function AdminIntegrationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Integrations Admin...</div>}>
      <AdminIntegrationsContent />
    </Suspense>
  );
}
