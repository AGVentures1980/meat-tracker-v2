'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import styles from './reviews.module.css';
import {
  Star,
  Download,
  ShieldCheck,
  Loader2,
  Database,
  Building2
} from 'lucide-react';

interface Review {
  id: string;
  organizationId: string;
  dataSourceId: string;
  externalId: string;
  authorName: string;
  text: string;
  rating: number;
  publishedAt: string;
  location: { name: string };
  sentimentAnalysis?: {
    overallSentiment: string;
    confidence: number;
  };
  topicMentions: Array<{ topicId: string; sentiment: string; confidence: number }>;
  menuMentions: Array<{ menuItem: { name: string }; sentiment: string; attribute?: string }>;
  employeeMentions: Array<{ rawName: string; sentiment: string }>;
  reviewResponses: Array<{ status: string; suggestedResponse?: string; finalResponse?: string }>;
  recoveryCases: Array<{ status: string; severity: string }>;
}

function ReviewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const locId = searchParams.get('locationId') || searchParams.get('entityId') || (typeof window !== 'undefined' ? localStorage.getItem('brasa_selected_entity') : 'ALL');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');

  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [sentimentFilter, setSentimentFilter] = useState('ALL');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      if (locId && locId !== 'ALL') {
        const locRes = await fetch('/api/locations');
        if (locRes.ok) {
          const locs = await locRes.json();
          const matched = locs.find((l: any) => l.id === locId);
          if (matched) setLocationName(matched.name);
        }
      } else {
        setLocationName('Texas de Brazil Enterprise Network');
      }

      const searchVal = searchParams.get('query') || '';
      
      const queryParams = new URLSearchParams();
      if (locId && locId !== 'ALL') queryParams.set('locationId', locId);
      if (ratingFilter !== 'ALL') queryParams.set('rating', ratingFilter);
      if (sentimentFilter !== 'ALL') queryParams.set('sentiment', sentimentFilter);
      if (searchVal) queryParams.set('query', searchVal);

      const res = await fetch(`/api/reviews?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
        if (data.length > 0) {
          setActiveReview((prev) => data.find((r: Review) => r.id === prev?.id) || data[0]);
        } else {
          setActiveReview(null);
        }
      }
    } catch (e) {
      console.error('Error fetching reviews:', e);
      setReviews([]);
      setActiveReview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [locId, ratingFilter, sentimentFilter]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < rating ? 'var(--status-watch)' : 'none'}
        stroke="var(--status-watch)"
      />
    ));
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <div className="flex-between mb-4">
            <div>
              <h1 style={{ fontSize: '25px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={24} style={{ color: 'var(--accent-gold)' }} />
                <span>Reviews Manager & Authenticated Provenance</span>
              </h1>
              <p className="text-secondary">
                {locationName ? `Traceable authentic review corpus for ${locationName}.` : 'Track, import, and analyze traceable real review content.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  backgroundColor: '#161922',
                  border: '1px solid #242838',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.82rem'
                }}
              >
                <option value="ALL">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  backgroundColor: '#161922',
                  border: '1px solid #242838',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.82rem'
                }}
              >
                <option value="ALL">All Sentiments</option>
                <option value="POSITIVE">Positive</option>
                <option value="MIXED">Mixed</option>
                <option value="NEGATIVE">Negative</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
              <Loader2 size={32} className="animate-spin text-info" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="card text-center" style={{ padding: '4rem', backgroundColor: '#161922', border: '1px solid #242838', borderRadius: '12px' }}>
              <Building2 size={44} style={{ margin: '0 auto 1rem', color: '#9ca3af', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                No Authenticated Reviews Available
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.88rem', margin: 0 }}>
                No authenticated review corpus or content items exist for {locationName || 'this location'} yet.
              </p>
            </div>
          ) : (
            <div className={styles.reviewsGrid}>
              <div className={styles.reviewsList}>
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className={`${styles.reviewCard} ${activeReview?.id === rev.id ? styles.activeCard : ''}`}
                    onClick={() => setActiveReview(rev)}
                  >
                    <div className="flex-between">
                      <strong style={{ fontSize: '0.95rem' }}>{rev.authorName}</strong>
                      <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        {new Date(rev.publishedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex-align mt-1 mb-2" style={{ gap: '0.5rem' }}>
                      <div className="flex-align">{renderStars(rev.rating)}</div>
                      <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                        {rev.location?.name || 'Store'}
                      </span>
                      {rev.sentimentAnalysis && (
                        <span
                          className={`badge ${
                            rev.sentimentAnalysis.overallSentiment === 'POSITIVE'
                              ? 'badge-healthy'
                              : rev.sentimentAnalysis.overallSentiment === 'NEGATIVE'
                              ? 'badge-critical'
                              : 'badge-warning'
                          }`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {rev.sentimentAnalysis.overallSentiment}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {rev.text.length > 120 ? `${rev.text.substring(0, 120)}...` : rev.text}
                    </p>
                  </div>
                ))}
              </div>

              {activeReview && (
                <div className={styles.detailPane}>
                  <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{activeReview.authorName}</h3>
                      <div className="flex-align mt-1" style={{ gap: '0.5rem' }}>
                        <div className="flex-align">{renderStars(activeReview.rating)}</div>
                        <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                          {new Date(activeReview.publishedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                      Verified {activeReview.dataSourceId || 'Google'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="form-label mb-2">Review Content</h4>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6, backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      {activeReview.text}
                    </p>
                  </div>

                  {activeReview.menuMentions && activeReview.menuMentions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="form-label mb-2">Extracted Menu Mentions</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {activeReview.menuMentions.map((mm, idx) => (
                          <span key={idx} className="badge badge-secondary">
                            🍽️ {mm.menuItem?.name || 'Item'} ({mm.sentiment})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeReview.employeeMentions && activeReview.employeeMentions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="form-label mb-2">Extracted Employee Mentions</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {activeReview.employeeMentions.map((em, idx) => (
                          <span key={idx} className="badge badge-primary">
                            👤 {em.rawName} ({em.sentiment})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#ffffff' }}>Loading Reviews Manager...</div>}>
      <ReviewsContent />
    </Suspense>
  );
}
