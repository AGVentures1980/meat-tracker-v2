'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Video, RefreshCw, Building2 } from 'lucide-react';

interface SocialPost {
  id: string;
  platform: string;
  author: string;
  caption: string;
  views: string;
  likes: string;
  sentiment: string;
}

function SocialListeningContent() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get('locationId') || searchParams.get('entityId');

  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [posts, setPosts] = useState<SocialPost[]>([]);

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!locationId || locationId === 'ALL') {
        setLocationName('Texas de Brazil Enterprise Network');
        setPosts([]);
        setLoading(false);
        return;
      }

      const locRes = await fetch('/api/locations');
      if (locRes.ok) {
        const locs = await locRes.json();
        const matched = locs.find((l: any) => l.id === locationId);
        if (matched) setLocationName(matched.name);
      }

      // Fetch reviews with channel SOCIAL if any
      const reviewsRes = await fetch(`/api/reviews?locationId=${locationId}`);
      if (reviewsRes.ok) {
        const reviews = await reviewsRes.json();
        const socialItems = (reviews || []).filter((r: any) => r.channel === 'SOCIAL');

        if (socialItems.length > 0) {
          const list: SocialPost[] = socialItems.map((s: any) => ({
            id: s.id,
            platform: s.dataSourceId || 'Social',
            author: s.authorName || '@guest',
            caption: s.text,
            views: '1.2K',
            likes: '140',
            sentiment: s.sentimentAnalysis?.overallSentiment || 'POSITIVE'
          }));
          setPosts(list);
        } else {
          setPosts([]);
        }
      }
    } catch (e) {
      console.error('Error fetching social posts:', e);
      setPosts([]);
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
                <Video className="text-warning" size={24} />
                <span>Social Listening & Video Intelligence</span>
              </h1>
              <p className="page-subtitle">
                {locationName ? `Social media sentiment & video mentions for ${locationName}.` : 'Social media sentiment, video mentions, and creator reach.'}
              </p>
            </div>
            <button onClick={fetchData} disabled={loading} className="btn btn-secondary flex-align" style={{ gap: '0.5rem' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sync Social Feeds</span>
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px' }}>
              <Building2 size={40} style={{ margin: '0 auto 1rem', color: '#9ca3af', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                No Authenticated Social Mentions Available
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
                No creator video reviews or social media listening records exist for {locationName || 'this location'} yet.
              </p>
            </div>
          ) : (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem', color: '#ffffff' }}>
                Trending Social Highlights ({posts.length} Verified Mentions)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {posts.map(p => (
                  <div key={p.id} style={{ backgroundColor: '#0a0b0d', border: '1px solid #242838', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{p.author} ({p.platform})</div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.35rem' }}>&quot;{p.caption}&quot;</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SocialListeningPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Social Listening...</div>}>
      <SocialListeningContent />
    </Suspense>
  );
}
