'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Upload,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  Info
} from 'lucide-react';

function ReviewImportWizardContent() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [provider, setProvider] = useState('GOOGLE');
  const [acquisitionMethod, setAcquisitionMethod] = useState<'CLIENT_IMPORT' | 'MANUAL_VERIFIED'>('CLIENT_IMPORT');
  const [coverageType, setCoverageType] = useState<'COMPLETE' | 'PARTIAL' | 'SAMPLE' | 'UNKNOWN'>('PARTIAL');
  const [declaredTotalRecords, setDeclaredTotalRecords] = useState('');
  const [sourceFileName, setSourceFileName] = useState('client_reviews_export.csv');
  const [rawText, setRawText] = useState('');
  const [manualAttestationConfirmed, setManualAttestationConfirmed] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => {
        setLocations(data);
        if (data.length > 0) setSelectedLocationId(data[0].id);
      })
      .catch(console.error);
  }, []);

  const handleParseCsv = () => {
    setErrorMsg('');
    if (!rawText.trim()) {
      setErrorMsg('Please paste or upload CSV data first.');
      return;
    }

    try {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least 1 data row.');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        const values = matches ? matches.map(v => v.trim().replace(/^["']|["']$/g, '')) : lines[i].split(',');
        
        const rObj: any = {};
        headers.forEach((h, idx) => {
          if (h.includes('text') || h.includes('review') || h.includes('comment')) rObj.reviewText = values[idx];
          else if (h.includes('rating') || h.includes('score') || h.includes('star')) rObj.rating = parseFloat(values[idx]);
          else if (h.includes('author') || h.includes('user') || h.includes('name')) rObj.authorName = values[idx];
          else if (h.includes('date') || h.includes('time') || h.includes('created')) rObj.publishedAt = values[idx];
          else if (h.includes('id')) rObj.externalReviewId = values[idx];
        });

        if (!rObj.reviewText && values[0]) rObj.reviewText = values[0];
        rows.push(rObj);
      }

      setParsedRows(rows);
      setStep(5); // Advance to Coverage Declaration
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse CSV data.');
    }
  };

  const handleCommitImport = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/reviews/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocationId,
          provider,
          acquisitionMethod,
          coverageType,
          declaredTotalRecords: declaredTotalRecords ? parseInt(declaredTotalRecords) : null,
          sourceFileName,
          rows: parsedRows,
          manualAttestationConfirmed
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportResult(data);
      setStep(7); // Advance to Commit Success
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div className="flex-between mb-4">
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet className="text-warning" size={24} />
                <span>Real Review Import & Dataset Provenance Wizard</span>
              </h1>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                Traceable dataset ingestion pipeline for genuine client reviews.
              </p>
            </div>
            <button onClick={() => router.push('/reviews')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
              Cancel
            </button>
          </div>

          {/* Stepper Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.75rem' }}>
            {['1. Location', '2. Provider', '3. Upload', '4. Mapping', '5. Coverage', '6. Preview', '7. Commit'].map((label, idx) => (
              <span key={idx} style={{ color: step === idx + 1 ? 'var(--accent-gold)' : step > idx + 1 ? 'var(--status-positive)' : 'var(--text-muted)', fontWeight: step === idx + 1 ? 800 : 500 }}>
                {label}
              </span>
            ))}
          </div>

          {errorMsg && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Select Location */}
          {step === 1 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={18} /> Step 1 — Select Target Location
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                Show only authorized real monitored subject entities in tenant organization.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {locations.map(loc => (
                  <label key={loc.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: selectedLocationId === loc.id ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="radio" name="loc" checked={selectedLocationId === loc.id} onChange={() => setSelectedLocationId(loc.id)} />
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{loc.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{loc.address}, {loc.city}, {loc.state} • Provenance: {loc.provenanceMode}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(2)} className="btn btn-primary flex-align" style={{ gap: '0.4rem' }}>
                  <span>Next: Provider Channel</span> <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Provider */}
          {step === 2 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={18} /> Step 2 — Select Source Channel & Acquisition Method
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Source Platform</label>
                  <select value={provider} onChange={e => setProvider(e.target.value)} className="form-select" style={{ width: '100%', marginTop: '0.3rem' }}>
                    <option value="GOOGLE">Google Places Export</option>
                    <option value="YELP">Yelp Export</option>
                    <option value="OPENTABLE">OpenTable Reviews</option>
                    <option value="FACEBOOK">Facebook Reviews</option>
                    <option value="INTERNAL_SURVEY">Internal Guest Survey</option>
                    <option value="OTHER">Other Client Export</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Acquisition Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.3rem' }}>
                    <button type="button" onClick={() => setAcquisitionMethod('CLIENT_IMPORT')} className={`btn ${acquisitionMethod === 'CLIENT_IMPORT' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left', padding: '0.75rem' }}>
                      <strong>CLIENT_IMPORT</strong>
                      <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '0.2rem' }}>Bulk CSV/XLSX export file provided by client</div>
                    </button>
                    <button type="button" onClick={() => setAcquisitionMethod('MANUAL_VERIFIED')} className={`btn ${acquisitionMethod === 'MANUAL_VERIFIED' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left', padding: '0.75rem' }}>
                      <strong>MANUAL_VERIFIED</strong>
                      <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '0.2rem' }}>Operator manual entry from real source evidence</div>
                    </button>
                  </div>
                </div>

                {acquisitionMethod === 'MANUAL_VERIFIED' && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(212, 160, 23, 0.1)', border: '1px solid rgba(212, 160, 23, 0.3)', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-gold)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={manualAttestationConfirmed} onChange={e => setManualAttestationConfirmed(e.target.checked)} style={{ marginTop: '0.15rem' }} />
                      <span><strong>Operator Confirmation Attestation:</strong> I confirm that this review represents an actual source review with traceable evidence.</span>
                    </label>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} className="btn btn-secondary">Back</button>
                <button onClick={() => setStep(3)} className="btn btn-primary flex-align" style={{ gap: '0.4rem' }}>
                  <span>Next: Upload Data</span> <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: Upload & Mapping */}
          {(step === 3 || step === 4) && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Upload size={18} /> Step 3 & 4 — Paste / Upload CSV Content
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                Header row required. Example: <code>reviewText, rating, authorName, publishedAt, externalReviewId</code>
              </p>

              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={`reviewText,rating,authorName,publishedAt,externalReviewId\n"Excellent rodizio service and picanha!",5.0,"Marcus Vance","2026-08-20","rev-google-001"`}
                rows={8}
                className="form-control"
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}
              />

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(2)} className="btn btn-secondary">Back</button>
                <button onClick={handleParseCsv} className="btn btn-primary flex-align" style={{ gap: '0.4rem' }}>
                  <span>Parse & Map Columns</span> <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Coverage Declaration */}
          {step === 5 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={18} /> Step 5 — Explicit Coverage Declaration
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                Declare the population coverage represented by this dataset. (Successful file import does NOT automatically imply COMPLETE coverage).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { type: 'COMPLETE', label: 'COMPLETE', desc: 'Dataset represents the entire relevant review population for a clearly defined source/time period.' },
                  { type: 'PARTIAL', label: 'PARTIAL', desc: 'Legitimate real data, but known to represent only part of the relevant source population.' },
                  { type: 'SAMPLE', label: 'SAMPLE', desc: 'Small or selectively collected set. Permits exploratory review browsing, but blocks population-level Brand Pulse claims.' },
                  { type: 'UNKNOWN', label: 'UNKNOWN', desc: 'Coverage boundaries cannot be verified.' }
                ].map(c => (
                  <label key={c.type} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: coverageType === c.type ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="radio" name="cov" checked={coverageType === c.type} onChange={() => setCoverageType(c.type as any)} style={{ marginTop: '0.2rem' }} />
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.label}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{c.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Declared Total Records in Source (Optional)</label>
                <input type="number" value={declaredTotalRecords} onChange={e => setDeclaredTotalRecords(e.target.value)} placeholder="e.g. 500" className="form-control" style={{ width: '100%', marginTop: '0.2rem' }} />
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(4)} className="btn btn-secondary">Back</button>
                <button onClick={() => setStep(6)} className="btn btn-primary flex-align" style={{ gap: '0.4rem' }}>
                  <span>Preview & Validation</span> <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Preview */}
          {step === 6 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={18} /> Step 6 — Preview & Validation Rules
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                Parsed <strong>{parsedRows.length} raw row(s)</strong> ready for deduplication and validation.
              </p>

              <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '1.25rem' }}>
                <table className="table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Text</th>
                      <th>Rating</th>
                      <th>Author</th>
                      <th>Ext ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reviewText}</td>
                        <td>{r.rating ? `${r.rating}★` : 'N/A'}</td>
                        <td>{r.authorName || 'Anonymous'}</td>
                        <td><code>{r.externalReviewId || 'AUTO'}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(5)} className="btn btn-secondary">Back</button>
                <button onClick={handleCommitImport} disabled={loading} className="btn btn-primary flex-align" style={{ gap: '0.4rem' }}>
                  {loading ? 'Processing Import...' : 'Commit & Ingest Dataset'} <CheckCircle size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Commit Success */}
          {step === 7 && importResult && (
            <div className="card" style={{ borderLeft: '4px solid var(--status-positive)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-positive)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={22} /> Dataset Import & Provenance Chain Committed!
              </h3>

              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', margin: '1rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem' }}>
                <div>Dataset ID: <code>{importResult.dataset.id}</code></div>
                <div>Provider: <strong>{importResult.dataset.provider}</strong></div>
                <div>Coverage Type: <strong>{importResult.dataset.coverageType}</strong></div>
                <div>Acquisition Method: <strong>{importResult.dataset.acquisitionMethod}</strong></div>
                <div>Accepted Records: <strong style={{ color: 'var(--status-positive)' }}>{importResult.dedupResult.acceptedCount}</strong></div>
                <div>Duplicates Filtered: <strong style={{ color: 'var(--accent-gold)' }}>{importResult.dedupResult.duplicateCount}</strong></div>
                <div>Rejected Rows: <strong style={{ color: 'var(--status-critical)' }}>{importResult.dedupResult.rejectedCount}</strong></div>
                <div>Data Quality: <strong>{importResult.dataset.dataQualityStatus}</strong></div>
              </div>

              <div style={{ padding: '0.85rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', fontSize: '0.8rem', color: '#3b82f6', marginBottom: '1.5rem' }}>
                <Info size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
                <strong>Analytics Eligibility:</strong> {importResult.eligibility.reason}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button onClick={() => router.push('/reviews')} className="btn btn-primary">
                  View Reviews Workspace
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default function ReviewImportWizardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Import Wizard...</div>}>
      <ReviewImportWizardContent />
    </Suspense>
  );
}
