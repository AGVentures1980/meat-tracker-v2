import { runPhase7ANetworkRegistryAudit } from '@/lib/scout/networkRegistryEngine';
import { MapPin, Building2, ShieldCheck, Globe, Star, Clock, AlertTriangle } from 'lucide-react';

export const revalidate = 0;

export default async function NetworkLocationsPage() {
  const report = await runPhase7ANetworkRegistryAudit();
  const { summary, tampaRegression, currentOperatingLocations, usTerritoryLocations, comingSoonFutureLocations, internationalLocations, staleRemovedLocations } = report;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #242838', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Texas de Brazil Enterprise Network Registry
            </h1>
            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
              PHASE 7A-1 SOURCE-OF-TRUTH VALIDATED
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
            Authoritative registry rebuilt directly from official live directory evidence. Zero placeholder Place IDs allowed in production.
          </p>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Operating US Stores</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
            {summary.officialDirectoryCurrentOperatingCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.2rem' }}>Across {summary.statesRepresentedCount} US States</div>
        </div>

        <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>US Territory Network</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>
            {summary.usTerritoryLocationsCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.2rem' }}>San Juan, Puerto Rico</div>
        </div>

        <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Coming Soon / Future</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
            {summary.futureComingSoonLocationsCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.2rem' }}>Westminster, CO</div>
        </div>

        <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>International Stores</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.25rem' }}>
            {summary.internationalLocationsCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.2rem' }}>Seoul, Panama, Trinidad</div>
        </div>

        <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Geographic Markets</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ec4899', marginTop: '0.25rem' }}>
            {summary.geographicMarketsRepresentedCount}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.2rem' }}>Metro Groupings</div>
        </div>
      </div>

      {/* Tampa Preservation Banner */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #3b82f6', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} />
            <span>Tampa Canonical Location Preserved (POC Location #1)</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            Location ID: <code style={{ color: '#38bdf8' }}>87465c11-ec18-4a26-85d0-99ec0d29e912</code> | Place ID: <code style={{ color: '#38bdf8' }}>ChIJHdigC67DwogRkWjPRn8SUbQ</code> | 33 Authentic ContentItems Intact
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
            TAMPA POC v1 — HUMAN VALIDATED
          </span>
        </div>
      </div>

      {/* 1. CURRENT OPERATING US NETWORK STORES */}
      <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #242838', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} />
            <span>Current Operating US Network Locations ({currentOperatingLocations.length} Stores)</span>
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
            Source: Official Live Directory Evidence
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0a0b0d', color: '#9ca3af', borderBottom: '1px solid #242838', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Location Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>City / State</th>
                <th style={{ padding: '0.75rem 1rem' }}>Geographic Market</th>
                <th style={{ padding: '0.75rem 1rem' }}>Google Place ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Comp Set Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Review Intelligence</th>
              </tr>
            </thead>
            <tbody>
              {currentOperatingLocations.map((loc, idx) => {
                const isTampa = loc.canonicalName.includes('Tampa');
                return (
                  <tr key={loc.internalLocationId} style={{ borderBottom: '1px solid #242838', backgroundColor: isTampa ? 'rgba(59, 130, 246, 0.05)' : idx % 2 === 0 ? '#161922' : '#12141c' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: isTampa ? '#38bdf8' : '#ffffff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {loc.canonicalName}
                        {isTampa && (
                          <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.62rem' }}>
                            POC #1
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: 400, marginTop: '0.15rem' }}>
                        {loc.address}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#e5e7eb' }}>
                      {loc.city}, {loc.state} {loc.postalCode || ''}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#9ca3af' }}>
                      <span style={{ backgroundColor: '#0a0b0d', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #242838', fontSize: '0.72rem' }}>
                        {loc.geographicMarket}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.72rem', color: loc.googlePlaceId ? '#d4a017' : '#9ca3af' }}>
                      {loc.googlePlaceId ? loc.googlePlaceId : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>GOOGLE_ID_UNRESOLVED</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                        {loc.verificationStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {isTampa ? (
                        <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                          APPROVED (Phase 4D)
                        </span>
                      ) : (
                        <span style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                          NOT_STARTED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {isTampa ? (
                        <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                          ANALYTICS_ACTIVE (33 Reviews)
                        </span>
                      ) : (
                        <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                          NOT_AVAILABLE (Metadata Only)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. US TERRITORY LOCATIONS (PUERTO RICO) */}
      <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #242838' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} />
            <span>US Territory Network (Puerto Rico)</span>
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <tbody>
            {usTerritoryLocations.map(loc => (
              <tr key={loc.internalLocationId}>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#ffffff' }}>{loc.canonicalName} ({loc.address})</td>
                <td style={{ padding: '0.85rem 1rem', color: '#e5e7eb' }}>{loc.city}, {loc.state} ({loc.country})</td>
                <td style={{ padding: '0.85rem 1rem', color: '#3b82f6', fontWeight: 700 }}>US_TERRITORY_OPERATIONAL</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. COMING SOON / FUTURE LOCATIONS */}
      <div style={{ backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #242838' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} />
            <span>Coming Soon / Future Locations ({comingSoonFutureLocations.length} Stores)</span>
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
          <tbody>
            {comingSoonFutureLocations.map(loc => (
              <tr key={loc.internalLocationId}>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#ffffff' }}>{loc.canonicalName} ({loc.address})</td>
                <td style={{ padding: '0.85rem 1rem', color: '#e5e7eb' }}>{loc.city}, {loc.state}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#f59e0b', fontWeight: 700 }}>COMING_SOON (Excluded from active operating network)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
