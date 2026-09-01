'use client';

import { useEffect, useState, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DataScoutPanel from '@/components/DataScoutPanel';

function DataSourcesContent() {
  const [orgId, setOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('brasa_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const orgIdVal = u.organizationId || u.organization?.id;
        if (orgIdVal) {
          setOrgId(orgIdVal);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const discoverOrg = async () => {
      try {
        const res = await fetch('/api/locations');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setOrgId(data[0].organizationId);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    discoverOrg();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <div className="mb-4">
            <h1 style={{ fontSize: '25px', fontWeight: 800 }}>Data Sources & DataScout™ Orchestration</h1>
            <p className="text-secondary">Manage automated collection targets, competitive discovery policies, and cost caps.</p>
          </div>

          {loading ? (
            <div style={{ color: '#9ca3af', padding: '2rem' }}>Loading DataScout Orchestrator...</div>
          ) : (
            <DataScoutPanel organizationId={orgId || '00000000-0000-0000-0000-000000000001'} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function DataSourcesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Data Sources...</div>}>
      <DataSourcesContent />
    </Suspense>
  );
}
