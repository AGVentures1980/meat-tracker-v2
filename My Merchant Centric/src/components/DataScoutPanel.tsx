import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
  Upload,
  PlusCircle,
  DollarSign,
  Eye,
  History,
  Settings,
  X,
  FileSpreadsheet,
  Check,
  Shield,
  Gauge,
  Bell
} from 'lucide-react';

interface DataScoutPanelProps {
  organizationId: string;
}

export default function DataScoutPanel({ organizationId }: DataScoutPanelProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedIsCompetitor, setSelectedIsCompetitor] = useState<boolean>(false);

  // States
  const [sources, setSources] = useState<any[]>([]);
  const [coverages, setCoverages] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [adapterOperational, setAdapterOperational] = useState<Record<string, boolean>>({});
  const [costMetrics, setCostMetrics] = useState<any>(null);
  const [ingestionRuns, setIngestionRuns] = useState<any[]>([]);

  // Sub-views / Modals
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [activeHistorySource, setActiveHistorySource] = useState<any | null>(null);
  const [historySnapshots, setHistorySnapshots] = useState<any[]>([]);
  const [activeEventsSource, setActiveEventsSource] = useState<any | null>(null);
  const [reputationEventsList, setReputationEventsList] = useState<any[]>([]);
  
  // CSV Import States
  const [csvRawText, setCsvRawText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProvider, setImportProvider] = useState('GOOGLE');
  const [isCsvComplete, setIsCsvComplete] = useState(false);
  const [importPreview, setImportPreview] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  // Manual Ingest States
  const [manualProvider, setManualProvider] = useState('GOOGLE');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualRating, setManualRating] = useState('5');
  const [manualText, setManualText] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStatus, setManualStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchTargets();
    fetchPolicies();
  }, [organizationId]);

  useEffect(() => {
    if (selectedLocation) {
      fetchScoutData();
    }
  }, [selectedLocation, selectedIsCompetitor]);

  const fetchTargets = async () => {
    try {
      // Fetch owned locations
      const locRes = await fetch('/api/locations');
      const owned = await locRes.json();
      
      // Fetch competitor locations
      // Query suggestion set or competitor locations
      const compRes = await fetch(`/api/integrations/competitors?organizationId=${organizationId}`);
      let comps = [];
      if (compRes.ok) {
        comps = await compRes.json();
      }

      // Merge into a single target selector options list
      const options = [
        ...owned.map((o: any) => ({ id: o.id, name: o.name, city: o.city, isCompetitor: false })),
        ...comps.map((c: any) => ({ id: c.id || c.competitorLocationId, name: `[Competitor] ${c.name || c.competitorName || 'Competitor Unit'}`, city: c.city || 'Tampa', isCompetitor: true }))
      ];
      
      setLocations(options);
      if (options.length > 0) {
        setSelectedLocation(options[0].id);
        setSelectedIsCompetitor(options[0].isCompetitor);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/integrations/scout/policy');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
        setAdapterOperational(data.adapterOperational || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchScoutData = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      const targetQuery = selectedIsCompetitor 
        ? `competitorLocationId=${selectedLocation}` 
        : `locationId=${selectedLocation}`;

      const res = await fetch(`/api/integrations/scout/sources?organizationId=${organizationId}&${targetQuery}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
        setCoverages(data.coverages || []);
      }

      // Fetch cost metrics
      const costRes = await fetch(`/api/integrations/scout/costs?organizationId=${organizationId}`);
      if (costRes.ok) {
        const costData = await costRes.json();
        setCostMetrics(costData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async () => {
    if (!selectedLocation) return;
    setDiscovering(true);
    try {
      const body = selectedIsCompetitor
        ? { organizationId, competitorLocationId: selectedLocation }
        : { organizationId, locationId: selectedLocation };

      const res = await fetch('/api/integrations/scout/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await fetchScoutData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDiscovering(false);
    }
  };

  const handleCheckNow = async (sourceId: string) => {
    try {
      const res = await fetch('/api/integrations/scout/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, sourceId })
      });
      if (res.ok) {
        await fetchScoutData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (sourceId: string, status: string) => {
    try {
      const res = await fetch('/api/integrations/scout/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, sourceId, status })
      });
      if (res.ok) {
        await fetchScoutData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/integrations/scout/sources?organizationId=${organizationId}&sourceId=${sourceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchScoutData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async (source: any) => {
    setActiveHistorySource(source);
    setHistorySnapshots([]);
    try {
      const res = await fetch(`/api/integrations/scout/history?organizationId=${organizationId}&sourceId=${source.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistorySnapshots(data.snapshots || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReputationEvents = async (source: any) => {
    setActiveEventsSource(source);
    setReputationEventsList([]);
    try {
      const res = await fetch(`/api/integrations/scout/events?externalSourceId=${source.id}`);
      if (res.ok) {
        const data = await res.json();
        setReputationEventsList(data.events || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMonitoring = async (sourceId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/integrations/scout/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          sourceId,
          action: 'TOGGLE_MONITORING',
          monitoringEnabled: enabled
        })
      });
      if (res.ok) {
        await fetchScoutData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const togglePolicy = async (provider: string, field: string, currentValue: boolean) => {
    try {
      const res = await fetch('/api/integrations/scout/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          [field]: !currentValue
        })
      });
      if (res.ok) {
        fetchPolicies();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CSV Processing
  const handleParseCsv = () => {
    setImportErrors([]);
    setImportResult(null);
    if (!csvRawText.trim()) return;

    const lines = csvRawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return;

    // Parse header and rows
    const parseCSVLine = (text: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(l => parseCSVLine(l));

    setCsvHeaders(headers);
    setCsvRows(rows);

    // Initial default mapping guesser
    const initialMapping: Record<string, string> = {};
    const standardFields = ['externalReviewId', 'author', 'rating', 'reviewText', 'publishedAt', 'responseText', 'sourceUrl'];

    headers.forEach(h => {
      const match = standardFields.find(f => f.toLowerCase() === h.toLowerCase().replace(/[^a-z]/g, ''));
      if (match) {
        initialMapping[h] = match;
      }
    });

    setColumnMapping(initialMapping);
    setImportPreview(true);
  };

  const handleExecuteImport = async () => {
    setImportErrors([]);
    setImportResult(null);

    // Map rows to JSON items
    const mappedReviews = csvRows.map(row => {
      const item: Record<string, any> = {};
      csvHeaders.forEach((header, idx) => {
        const mappedField = columnMapping[header];
        if (mappedField) {
          item[mappedField] = row[idx];
        }
      });
      return item;
    });

    // Validate mappings
    const missingText = mappedReviews.some(r => !r.reviewText);
    if (missingText) {
      setImportErrors(['CSV mapping error: Must map a column to "reviewText" field.']);
      return;
    }

    try {
      const body = {
        organizationId,
        locationId: selectedIsCompetitor ? undefined : selectedLocation,
        competitorLocationId: selectedIsCompetitor ? selectedLocation : undefined,
        provider: importProvider,
        reviews: mappedReviews,
        coverageType: isCsvComplete ? 'COMPLETE' : 'PARTIAL'
      };

      const res = await fetch('/api/integrations/scout/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        setCsvRawText('');
        setImportPreview(false);
        fetchScoutData();
      } else {
        setImportErrors([data.error || 'Import failed.']);
      }
    } catch (e: any) {
      setImportErrors([e.message || 'Error executing import.']);
    }
  };

  // Manual Ingest
  const handleManualIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualStatus(null);

    try {
      const body = {
        organizationId,
        locationId: selectedIsCompetitor ? undefined : selectedLocation,
        competitorLocationId: selectedIsCompetitor ? selectedLocation : undefined,
        provider: manualProvider,
        authorName: manualAuthor,
        rating: manualRating,
        text: manualText,
        sourceUrl: manualUrl,
        publishedAt: manualDate
      };

      const res = await fetch('/api/integrations/scout/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setManualStatus('Review ingested and AI analysis job queued.');
        setManualAuthor('');
        setManualText('');
        setManualUrl('');
        fetchScoutData();
      } else {
        const data = await res.json();
        setManualStatus(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setManualStatus(`Error: ${e.message}`);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'MONITORING':
        return 'badge-excellent';
      case 'PENDING_CONFIRMATION':
      case 'DISCOVERED':
        return 'badge-watch';
      case 'REJECTED':
      case 'DISABLED':
        return 'badge-critical';
      default:
        return 'badge-warning';
    }
  };

  const getCoverageBadgeClass = (cov: string) => {
    switch (cov) {
      case 'COMPLETE':
        return 'badge-excellent';
      case 'PARTIAL':
        return 'badge-healthy';
      case 'SAMPLE':
        return 'badge-watch';
      case 'METADATA_ONLY':
        return 'badge-warning';
      default:
        return 'badge-critical';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Target Selector Header */}
      <div className="card flex-between" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex-align" style={{ gap: '0.75rem' }}>
          <Gauge className="text-positive" size={22} />
          <h3 className="card-title" style={{ margin: 0 }}>Active Ingestion Target</h3>
        </div>
        <div className="flex-align" style={{ gap: '1rem' }}>
          <select
            value={`${selectedLocation}:${selectedIsCompetitor}`}
            onChange={(e) => {
              const [id, isComp] = e.target.value.split(':');
              setSelectedLocation(id);
              setSelectedIsCompetitor(isComp === 'true');
            }}
            className="form-input"
            style={{ width: '320px', padding: '0.45rem', fontSize: '0.85rem' }}
          >
            {locations.map(loc => (
              <option key={`${loc.id}:${loc.isCompetitor}`} value={`${loc.id}:${loc.isCompetitor}`}>
                {loc.name} ({loc.city})
              </option>
            ))}
          </select>
          <button
            onClick={handleDiscover}
            disabled={discovering || !selectedLocation}
            className="btn btn-primary flex-align"
            style={{ gap: '0.35rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
          >
            {discovering ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span>Discover Profiles</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>

        {/* Data Sources Table Card */}
        <div className="card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex-between">
            <h3 className="card-title">Discovered Source Profiles</h3>
            <button onClick={fetchScoutData} className="btn btn-secondary flex-align" style={{ gap: '0.25rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              <RefreshCw size={12} />
              <span>Reload</span>
            </button>
          </div>

          {loading ? (
            <div className="flex-align" style={{ justifyContent: 'center', height: '200px' }}>
              <Loader2 className="animate-spin text-positive" size={28} />
            </div>
          ) : sources.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No external source profiles mapped or discovered yet. Select a location and click &quot;Discover Profiles&quot;.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Review Count</th>
                    <th>Coverage</th>
                    <th>Confidence</th>
                    <th>Last Checked</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(src => {
                    const snap = src.snapshots[0];
                    const cov = coverages.find(c => c.provider === src.provider);
                    return (
                      <tr key={src.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{src.provider}</div>
                          <a href={src.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent-gold)' }}>
                            View Storefront
                          </a>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>Method: {src.discoveryMethod || 'DETERMINISTIC_MATCH'}</span>
                            <span>Discovered: {src.createdAt ? new Date(src.createdAt).toLocaleDateString() : '—'}</span>
                            {src.verifiedBy && (
                              <span>Verified By: {src.verifiedBy} ({src.verifiedAt ? new Date(src.verifiedAt).toLocaleDateString() : '—'})</span>
                            )}
                            {src.adapterUsed && (
                              <span>Adapter: {src.adapterUsed}</span>
                            )}
                            {snap?.acquisitionMethod && (
                              <span>Acquisition: {snap.acquisitionMethod}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(src.status)}`} style={{ fontSize: '0.65rem' }}>
                            {src.status}
                          </span>
                        </td>
                        <td>{snap ? snap.rating : '—'}</td>
                        <td>{snap ? snap.reviewCount?.toLocaleString() : '—'}</td>
                        <td>
                          <span className={`badge ${getCoverageBadgeClass(cov?.coverageType || 'UNKNOWN')}`} style={{ fontSize: '0.65rem' }}>
                            {cov?.coverageType || 'METADATA_ONLY'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: src.confidence === 'HIGH' ? 'var(--text-positive)' : 'var(--text-warning)' }}>
                            {src.confidence}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>
                          {src.lastCheckedAt ? new Date(src.lastCheckedAt).toLocaleTimeString() : 'Never'}
                        </td>
                        <td>
                          <div className="flex-align" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleCheckNow(src.id)}
                              className="btn btn-secondary"
                              title="Sync public metadata snapshot"
                              style={{ padding: '0.25rem', fontSize: '0.7rem' }}
                            >
                              <RefreshCw size={12} />
                            </button>
                            <button
                              onClick={() => fetchHistory(src)}
                              className="btn btn-secondary"
                              title="View snapshot trends history"
                              style={{ padding: '0.25rem', fontSize: '0.7rem' }}
                            >
                              <History size={12} />
                            </button>
                            <button
                              onClick={() => fetchReputationEvents(src)}
                              className="btn btn-secondary"
                              title="View Reputation Events timeline"
                              style={{ padding: '0.25rem', fontSize: '0.7rem', color: 'var(--accent-gold)' }}
                            >
                              <Bell size={12} />
                            </button>
                            <button
                              onClick={() => handleToggleMonitoring(src.id, !src.monitoringEnabled)}
                              className={`btn ${src.monitoringEnabled ? 'btn-secondary' : 'btn-primary'}`}
                              title={src.monitoringEnabled ? 'Pause automated monitoring' : 'Enable automated monitoring'}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                            >
                              {src.monitoringEnabled ? 'Pause' : 'Resume'}
                            </button>
                            {(src.status === 'PENDING_CONFIRMATION' || src.status === 'DISCOVERED') && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(src.id, 'CONFIRMED')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', backgroundColor: 'var(--text-positive)', borderColor: 'var(--text-positive)' }}
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(src.id, 'REJECTED')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', color: 'var(--accent-red)' }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteSource(src.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cost Metrics Dashboard Card */}
        <div className="card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="card-title flex-align" style={{ gap: '0.35rem' }}>
            <DollarSign className="text-warning" size={18} />
            <span>Data Cost Dashboard</span>
          </h3>

          {costMetrics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Estimated Live Cost</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-positive)' }}>
                  ${costMetrics.costs.estimatedLiveCost.toFixed(2)}
                </div>
              </div>

              <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span className="text-muted">Demo Estimate (Mock):</span>
                <strong style={{ color: 'var(--text-warning)' }}>${costMetrics.costs.demoEstimate.toFixed(2)} (DEMO ONLY)</strong>
              </div>

              <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span className="text-muted">Actual API/Provider Cost:</span>
                <strong>
                  {typeof costMetrics.costs.actualProviderCost === 'number'
                    ? `$${costMetrics.costs.actualProviderCost.toFixed(2)}`
                    : costMetrics.costs.actualProviderCost}
                </strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>Live Ingest Jobs</div>
                  <strong style={{ fontSize: '0.95rem' }}>{costMetrics.metrics.aiItemsProcessed}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>Demo Ingest Jobs</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-warning)' }}>{costMetrics.metrics.demoItemsProcessed}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>Monitor Checks</div>
                  <strong style={{ fontSize: '0.95rem' }}>{costMetrics.metrics.monitoringRuns}</strong>
                </div>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>Discovery Runs</div>
                  <strong style={{ fontSize: '0.95rem' }}>{costMetrics.metrics.discoveryRuns}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading cost metrics...</div>
          )}

          {/* Cost Configuration Limits */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>MVP Cost Controls</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
              <div className="flex-between">
                <span>Owned location check limit:</span>
                <strong>2 / day</strong>
              </div>
              <div className="flex-between">
                <span>Competitor check limit:</span>
                <strong>1 / day</strong>
              </div>
            </div>
          </div>
        </div>

        {/* CSV Review Import Panel Card */}
        <div className="card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="card-title flex-align" style={{ gap: '0.35rem' }}>
            <FileSpreadsheet size={18} className="text-positive" />
            <span>CSV Review Ingestion</span>
          </h3>

          {!importPreview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>1. Select Target Provider</label>
                <select value={importProvider} onChange={(e) => setImportProvider(e.target.value)} className="form-input mt-1">
                  <option value="GOOGLE">Google</option>
                  <option value="YELP">Yelp</option>
                  <option value="OPENTABLE">OpenTable</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>2. Paste CSV Rows (Include Headers)</label>
                <textarea
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder={`sourceUrl,externalReviewId,author,rating,reviewText,publishedAt
https://maps.google.com/...,g-rev-1,Carlos V.,5,Excellent service and picanha steak!,2026-08-25`}
                  className="form-input mt-1"
                  rows={6}
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4' }}
                />
              </div>

              <div className="flex-align" style={{ gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="csvCompleteToggle"
                  checked={isCsvComplete}
                  onChange={(e) => setIsCsvComplete(e.target.checked)}
                />
                <label htmlFor="csvCompleteToggle" style={{ fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  This export represents the COMPLETE review history of this location.
                </label>
              </div>

              <button onClick={handleParseCsv} className="btn btn-primary mt-2" style={{ padding: '0.5rem' }}>
                Parse and Map Columns
              </button>

              {importResult && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--text-positive)', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-positive)' }}>Ingestion run success!</div>
                  <ul style={{ fontSize: '0.75rem', paddingLeft: '1rem', marginTop: '0.25rem' }}>
                    <li>Raw received: {importResult.rawItemsReceived}</li>
                    <li>Normalized: {importResult.normalizedItems}</li>
                    <li>Deduplicated (skipped): {importResult.deduplicatedItems}</li>
                    <li>Accepted & Ingested: {importResult.acceptedItems}</li>
                    <li>Rejected (invalid): {importResult.rejectedItems}</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex-between">
                <strong style={{ fontSize: '0.8rem' }}>Map Column Fields</strong>
                <button onClick={() => setImportPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.25rem' }}>
                {csvHeaders.map(header => (
                  <div key={header} className="flex-between" style={{ fontSize: '0.75rem' }}>
                    <span>CSV Header: <code>{header}</code></span>
                    <select
                      value={columnMapping[header] || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                      className="form-input"
                      style={{ width: '180px', padding: '0.2rem' }}
                    >
                      <option value="">(Ignore Column)</option>
                      <option value="externalReviewId">External Review ID</option>
                      <option value="author">Author Name</option>
                      <option value="rating">Rating (1-5 stars)</option>
                      <option value="reviewText">Review Text Content</option>
                      <option value="publishedAt">Published Timestamp</option>
                      <option value="sourceUrl">Source URL</option>
                    </select>
                  </div>
                ))}
              </div>

              {importErrors.length > 0 && (
                <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                  {importErrors.map(e => <div key={e}>{e}</div>)}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => setImportPreview(false)} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem' }}>
                  Back
                </button>
                <button onClick={handleExecuteImport} className="btn btn-primary" style={{ flex: 1, padding: '0.4rem' }}>
                  Ingest Reviews
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manual Ingestion Form Card */}
        <div className="card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="card-title flex-align" style={{ gap: '0.35rem' }}>
            <PlusCircle size={18} className="text-warning" />
            <span>Manual Review Ingestion</span>
          </h3>

          <form onSubmit={handleManualIngest} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Provider</label>
                <select value={manualProvider} onChange={(e) => setManualProvider(e.target.value)} className="form-input">
                  <option value="GOOGLE">Google</option>
                  <option value="YELP">Yelp</option>
                  <option value="OPENTABLE">OpenTable</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Author</label>
                <input type="text" value={manualAuthor} onChange={(e) => setManualAuthor(e.target.value)} placeholder="e.g. John D." className="form-input" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Rating</label>
                <select value={manualRating} onChange={(e) => setManualRating(e.target.value)} className="form-input">
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Date</label>
                <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="form-input" required />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Review Text</label>
              <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Review content..." className="form-input" rows={2} required />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Review Source URL (Optional)</label>
              <input type="url" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://..." className="form-input" />
            </div>

            <button type="submit" className="btn btn-primary mt-1" style={{ padding: '0.4rem' }}>
              Submit Manual Review
            </button>

            {manualStatus && (
              <div style={{ fontSize: '0.75rem', color: manualStatus.startsWith('Error') ? 'var(--accent-red)' : 'var(--text-positive)', marginTop: '0.25rem', textAlign: 'center' }}>
                {manualStatus}
              </div>
            )}
          </form>
        </div>

        {/* Source Policies Gating Panel Card */}
        <div className="card" style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="card-title flex-align" style={{ gap: '0.35rem' }}>
            <Shield className="text-positive" size={18} />
            <span>Platform Integration Policies</span>
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Platform Provider</th>
                  <th>Adapter</th>
                  <th>Allow Discovery</th>
                  <th>Allow Public Metadata</th>
                  <th>Approved Automated Adapter</th>
                  <th>Gating Logic / Rules Description</th>
                </tr>
              </thead>
              <tbody>
                {policies.map(pol => (
                  <tr key={pol.id}>
                    <td><strong>{pol.provider}</strong></td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-gold)' }}>
                        {pol.provider === 'GOOGLE' ? 'Google Places' : pol.provider === 'YELP' ? 'Yelp API (Mock)' : pol.provider === 'OPENTABLE' ? 'OpenTable Web (Mock)' : 'Default adapter'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => togglePolicy(pol.provider, 'allowDiscovery', pol.allowDiscovery)}
                        className={`btn ${pol.allowDiscovery ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        {pol.allowDiscovery ? 'Allowed' : 'Blocked'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => togglePolicy(pol.provider, 'allowPublicMetadata', pol.allowPublicMetadata)}
                        className={`btn ${pol.allowPublicMetadata ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        {pol.allowPublicMetadata ? 'Allowed' : 'Blocked'}
                      </button>
                    </td>
                    <td>
                      <div className="flex-align" style={{ gap: '0.5rem' }}>
                        <button
                          onClick={() => togglePolicy(pol.provider, 'allowAutomatedMonitoring', pol.allowAutomatedMonitoring)}
                          className={`btn ${pol.allowAutomatedMonitoring ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        >
                          {pol.allowAutomatedMonitoring ? 'Permitted' : 'Gated'}
                        </button>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: pol.allowAutomatedMonitoring && adapterOperational[pol.provider] ? 'var(--text-positive)' : 'var(--text-warning)' }}>
                          {pol.allowAutomatedMonitoring && adapterOperational[pol.provider] ? 'Available (Active)' : 'Unavailable / Not Operational'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {pol.notes || 'Default compliance gating rules active.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Snapshot Trend History Modal popup */}
      {activeHistorySource && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            <div className="flex-between">
              <h3 className="card-title">Metadata Snapshots Delta Log</h3>
              <button onClick={() => setActiveHistorySource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem' }}>
              Source: <strong>{activeHistorySource.provider}</strong> for Location: <strong>{locations.find(l => l.id === selectedLocation)?.name}</strong>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {historySnapshots.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No metadata changes captured yet.
                </div>
              ) : (
                <>
                  {historySnapshots.length === 1 && (
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', border: '1px dashed var(--accent-gold)', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--accent-gold)', marginBottom: '0.75rem', textAlign: 'center' }}>
                      Baseline established — additional checks required for trend analysis.
                    </div>
                  )}
                  <table className="table" style={{ width: '100%', fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        <th>Capture Date</th>
                        <th>Rating</th>
                        <th>Rating Delta</th>
                        <th>Reviews</th>
                        <th>Reviews Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historySnapshots.map((snap, idx) => {
                        const prev = historySnapshots[idx + 1];
                        let ratingDelta = 0;
                        let reviewsDelta = 0;
                        let hasPrev = !!prev;
                        if (prev) {
                          ratingDelta = (snap.rating || 0) - (prev.rating || 0);
                          reviewsDelta = (snap.reviewCount || 0) - (prev.reviewCount || 0);
                        }

                        return (
                          <tr key={snap.id}>
                            <td>{new Date(snap.capturedAt).toLocaleString()}</td>
                            <td>{snap.rating !== null && snap.rating !== undefined ? snap.rating.toFixed(1) : '—'}</td>
                            <td>
                              {hasPrev ? (
                                <span style={{ color: ratingDelta > 0 ? 'var(--text-positive)' : ratingDelta < 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                                  {ratingDelta > 0 ? `+${ratingDelta.toFixed(1)}` : ratingDelta < 0 ? ratingDelta.toFixed(1) : '0.0'}
                                </span>
                              ) : '—'}
                            </td>
                            <td>{snap.reviewCount !== null && snap.reviewCount !== undefined ? snap.reviewCount.toLocaleString() : '—'}</td>
                            <td>
                              {hasPrev ? (
                                <span style={{ color: reviewsDelta > 0 ? 'var(--text-positive)' : reviewsDelta < 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                                  {reviewsDelta > 0 ? `+${reviewsDelta}` : reviewsDelta < 0 ? reviewsDelta : '0'}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reputation Events Modal popup */}
      {activeEventsSource && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '600px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            <div className="flex-between">
              <h3 className="card-title flex-align" style={{ gap: '0.5rem' }}>
                <Bell size={18} className="text-warning" />
                <span>Reputation Events Timeline</span>
              </h3>
              <button onClick={() => setActiveEventsSource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem' }}>
              Source: <strong>{activeEventsSource.provider}</strong> ({activeEventsSource.adapterUsed || 'GOOGLE_PLACES'})
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reputationEventsList.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No reputation change events detected yet for this source.
                </div>
              ) : (
                reputationEventsList.map((evt) => {
                  const isAlert = evt.severity === 'ALERT';
                  const isWatch = evt.severity === 'WATCH';
                  const badgeClass = isAlert ? 'badge-critical' : isWatch ? 'badge-warning' : 'badge-healthy';

                  return (
                    <div key={evt.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div className="flex-between">
                        <div className="flex-align" style={{ gap: '0.5rem' }}>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>
                            {evt.severity}
                          </span>
                          <strong style={{ fontSize: '0.85rem' }}>{evt.eventType}</strong>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {new Date(evt.detectedAt).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {evt.metadata?.message || JSON.stringify(evt.delta || evt.currentValue)}
                      </div>
                      {evt.evidenceSnapshot && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-gold)', display: 'flex', gap: '0.75rem' }}>
                          <span>Snapshot Rating: {evt.evidenceSnapshot.rating ?? '—'}</span>
                          <span>Reviews: {evt.evidenceSnapshot.reviewCount?.toLocaleString() ?? '—'}</span>
                          <span>Status: {evt.evidenceSnapshot.businessStatus ?? 'OPERATIONAL'}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
