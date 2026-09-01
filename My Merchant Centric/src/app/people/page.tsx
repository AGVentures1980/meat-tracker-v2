'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Users, RefreshCw, Building2 } from 'lucide-react';

interface StaffMember {
  name: string;
  role: string;
  sentiment: string;
  mentions: number;
  evidenceText: string;
}

function PeopleContent() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');

  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!locationId || locationId === 'ALL') {
        setLocationName('Texas de Brazil Enterprise Network');
        setStaffList([]);
        setLoading(false);
        return;
      }

      const locRes = await fetch('/api/locations');
      if (locRes.ok) {
        const locs = await locRes.json();
        const matched = locs.find((l: any) => l.id === locationId);
        if (matched) setLocationName(matched.name);
      }

      const intelRes = await fetch(`/api/reviews/intelligence?locationId=${locationId}`);
      if (intelRes.ok) {
        const data = await intelRes.json();
        const recs = data.employeeRecognitions || [];

        if (recs.length > 0) {
          const list: StaffMember[] = recs.map((r: any) => ({
            name: r.employeeRawName,
            role: r.recognitionCategory === 'EXEMPLARY_SERVICE' ? 'Exemplary Server' : 'Service Staff',
            sentiment: 'Positive (100%)',
            mentions: 1,
            evidenceText: r.positiveEvidence
          }));
          setStaffList(list);
        } else {
          setStaffList([]);
        }
      }
    } catch (e) {
      console.error('Error fetching people intelligence:', e);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <div>
              <h1 className="page-title flex-align" style={{ gap: '0.5rem' }}>
                <Users className="text-warning" size={24} />
                <span>People & Tenure Intelligence</span>
              </h1>
              <p className="page-subtitle">
                {locationName ? `Evidence-backed staff mentions & service recognition for ${locationName}.` : 'Staff mention sentiment & employee recognition.'}
              </p>
            </div>
            <button onClick={fetchData} disabled={loading} className="btn btn-secondary flex-align" style={{ gap: '0.5rem' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh People Analytics</span>
            </button>
          </div>

          {staffList.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px' }}>
              <Building2 size={40} style={{ margin: '0 auto 1rem', color: '#9ca3af', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                No Authenticated Employee Intelligence Available
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
                No explicit named employee mentions exist for {locationName || 'this location'} yet.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Team Member</th>
                    <th>Recognition Category</th>
                    <th>Guest Sentiment</th>
                    <th>Mentions Volume</th>
                    <th>Evidence Excerpt</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((st, idx) => (
                    <tr key={idx}>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{st.name}</strong></td>
                      <td><span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{st.role}</span></td>
                      <td><span className="badge badge-healthy" style={{ fontSize: '0.65rem' }}>{st.sentiment}</span></td>
                      <td>{st.mentions} review mention</td>
                      <td style={{ fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>&quot;{st.evidenceText}&quot;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading People Intelligence...</div>}>
      <PeopleContent />
    </Suspense>
  );
}
