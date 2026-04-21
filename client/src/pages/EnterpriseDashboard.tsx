import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const EnterpriseDashboard: React.FC = () => {
    const { user, selectedCompany } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Determine which store to fetch for.
                // In a real enterprise setup, there might be a dropdown for the specific unit,
                // but we will default to user.store_id or 1 for this rollout skeleton.
                const storeId = user?.store_id || 1; 

                const res = await fetch(`/api/v1/enterprise/dashboard?store_id=${storeId}`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                } else {
                    console.error('Failed to load enterprise data:', result.message);
                }
            } catch (err) {
                console.error('Failed to fetch Enterprise Dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, selectedCompany]);

    if (loading) return <LoadingSpinner />;

    // Calculate aggregated metrics from the incoming payload (stub)
    const lbsGuest = 1.74; // Stub calculation
    const variance = "0.02";

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Enterprise Command Matrix" 
                subtitle="High-level Multi-Unit metrics and reconciliation views." 
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* KPI Header */}
                <div className="bg-[#1A1A1A] p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <BuildingOfficeIcon className="w-5 h-5 text-[#C5A059]" />
                        <h2 className="text-gray-400 font-medium">Lbs / Guest</h2>
                    </div>
                    <p className="text-3xl font-bold text-white">{lbsGuest}</p>
                    <p className="text-sm text-green-400 mt-1">Variance: {variance}</p>
                </div>

                {/* Forecast Accuracy Block */}
                <div className="bg-[#1A1A1A] p-6 rounded-xl border border-gray-800 md:col-span-2 text-gray-400">
                    <h2 className="text-gray-300 font-medium border-b border-gray-800 pb-2 mb-4">Forecast Intelligence (Latest)</h2>
                    {data?.forecastIntelligence?.length > 0 ? (
                        <div className="space-y-2">
                            {data.forecastIntelligence.map((f: any) => (
                                <div key={f.id} className="flex justify-between border-b border-gray-800/50 pb-1">
                                    <span>{new Date(f.business_date).toLocaleDateString()}</span>
                                    <span>Reservation: {f.reservation_forecast || 'N/A'}</span>
                                    <span>Manager: {f.manager_adjusted_forecast || 'N/A'}</span>
                                    <span>Actual: {f.actual_dine_in_guests || 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm">Awaiting OpenTable / POS ingestion batch...</p>
                    )}
                </div>
            </div>

            {/* Inbound Variances Block */}
            <div className="bg-[#1A1A1A] p-6 rounded-xl border border-gray-800 text-gray-400">
                <h2 className="text-gray-300 font-medium border-b border-gray-800 pb-2 mb-4">Inbound Reconciliation (Discrepancies &gt; 0)</h2>
                {data?.inboundVariances?.length > 0 ? (
                    <div className="space-y-2">
                        {data.inboundVariances.map((inv: any) => (
                            <div key={inv.id} className="flex justify-between border-b border-gray-800/50 pb-1">
                                <span>{inv.item_name} ({new Date(inv.date).toLocaleDateString()})</span>
                                <span>Expected: {inv.expected_weight_lb} lb</span>
                                <span>Received: {inv.received_weight_lb} lb</span>
                                <span className={inv.weight_discrepancy_lb < 0 ? 'text-red-400' : 'text-yellow-400'}>
                                    Diff: {inv.weight_discrepancy_lb} lb
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm">No recent significant dock discrepancies detected.</p>
                )}
            </div>
            
            {/* Flags & Notifications */}
            <div className="mt-8">
                <p className="text-xs text-gray-600">
                    * Modulo de Enterprise Intelligence carregado sob Feature Flag (FF_ENTERPRISE_DASHBOARD). 
                    As métricas dependem do preenchimento das APIs de POS e OpenTable por D+1.
                </p>
            </div>
        </div>
    );
};
