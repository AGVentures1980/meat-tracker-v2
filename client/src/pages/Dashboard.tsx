import React, { useState, useEffect } from 'react';
import { FileText, Download, LayoutGrid, TrendingUp, Calendar, DownloadCloud, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkReportCard } from '../components/NetworkReportCard';
import { WeeklyInputForm } from '../components/WeeklyInputForm';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';

// --- Types ---
interface StorePerformance {
    id: number;
    name: string;
    location: string;
    guests: number;
    usedQty: number; // lbs
    usedValue: number; // $
    costPerLb: number;
    costPerGuest: number;
    lbsPerGuest: number;
    lbsGuestVar: number; // Variance from 1.76
    target_lbs_guest?: number; // Dynamic Target
    target_cost_guest?: number; // Dynamic Cost Target
    costGuestVar: number; // Variance from Plan
    impactYTD: number;
    status: 'Optimal' | 'Warning' | 'Critical';
}

// ... imports

// Inside Component ...

                        <thead>
                            <tr className="bg-[#121212] text-gray-500 text-[10px] uppercase font-mono tracking-wider border-b border-[#333]">
                                <th className="p-4 font-normal">Store Location</th>
                                <th className="p-4 font-normal text-right">Guests</th>
                                <th className="p-4 font-normal text-right">Lbs/Guest<br/><span className="text-[9px] opacity-70">(Act / Tgt)</span></th>
                                <th className="p-4 font-normal text-right">$/Guest<br/><span className="text-[9px] opacity-70">(Act / Tgt)</span></th>
                                <th className="p-4 font-normal text-right">Var $/Guest</th>
                                <th className="p-4 font-normal text-right">Fin. Impact</th>
                                <th className="p-4 font-normal text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333] font-mono text-sm">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500 animate-pulse">Initializing Data Stream...</td></tr>
                            ) : (
                                performanceData.map((store) => (
                                    <tr key={store.id} className="hover:bg-[#252525] transition-colors group">
                                        <td className="p-4 font-bold text-white group-hover:text-[#00FF94] transition-colors">
                                            {store.name}
                                            <span className="block text-[10px] text-gray-600 font-normal uppercase">{store.location}</span>
                                        </td>
                                        <td className="p-4 text-right text-gray-300">{store.guests.toLocaleString()}</td>
                                        
                                        {/* Lbs/Guest */}
                                        <td className="p-4 text-right">
                                            <div className={`font-bold ${store.lbsPerGuest > (store.target_lbs_guest || 1.76) ? 'text-[#FF9F1C]' : 'text-[#00FF94]'}`}>
                                                {store.lbsPerGuest.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                / {(store.target_lbs_guest || 1.76).toFixed(2)}
                                            </div>
                                        </td>

                                        {/* $/Guest */}
                                        <td className="p-4 text-right">
                                            <div className={`font-bold ${store.costPerGuest > (store.target_cost_guest || 9.94) ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                                ${store.costPerGuest.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                / ${(store.target_cost_guest || 9.94).toFixed(2)}
                                            </div>
                                        </td>

                                        {/* Cost Variance */}
                                         <td className={`p-4 text-right ${store.costGuestVar > 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                            {store.costGuestVar > 0 ? '+' : ''}${store.costGuestVar.toFixed(2)}
                                        </td>

                                        <td className={`p-4 text-right font-bold ${store.impactYTD < 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                            {store.impactYTD < 0 ? '-' : '+'}${Math.abs(store.impactYTD).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-2 py-1 text-[10px] rounded-none font-bold uppercase tracking-wide border ${store.status === 'Optimal' ? 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30' :
                                                store.status === 'Warning' ? 'bg-[#FF9F1C]/10 text-[#FF9F1C] border-[#FF9F1C]/30' :
                                                    'bg-[#FF2A6D]/10 text-[#FF2A6D] border-[#FF2A6D]/30 animate-pulse'
                                                }`}>
                                                {store.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table >
                </div >
            </div >

    {/* Input Modal */ }
{
    showWeeklyInput && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <WeeklyInputForm
                storeId={selectedStoreId}
                onClose={() => setShowWeeklyInput(false)}
                onSubmit={() => {
                    // Trigger refresh
                    window.location.reload();
                }}
            />
        </div>
    )
}
        </DashboardLayout >
    );
};
