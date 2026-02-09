import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

interface ReportCardData {
    year: number;
    week: number;
    costPerGuest: number;
    lbsPerGuest: number;
    planLbsPerGuest: number;
    lbsPerGuest12UkAvg: number;
    lbsPerGuestPTD: number;
    lbsPerGuestYTD: number;
    planLbsPerGuestYTD: number;
    impactYTD: number;
}

import { useAuth } from '../context/AuthContext';

export const NetworkReportCard = () => {
    const { user } = useAuth();
    const [year, setYear] = useState(2026);
    const [week, setWeek] = useState(9);
    const [data, setData] = useState<ReportCardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return; // Wait for auth

        setLoading(true);
        try {
            const baseUrl = '/api/v1';

            // Use Real JWT from Auth Context
            const token = `Bearer ${user.token}`;

            // Correct Endpoint matching backend routes
            const res = await fetch(`${baseUrl}/dashboard/report-card?year=${year}&week=${week}`, {
                headers: { 'Authorization': token }
            });

            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else {
                console.warn("Report Card Access Denied or Failed");
                setData(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [year, week, user]);

    // Helpers for rendering rows
    const renderRow = (label: string, value: string | number, isCurrency = false, highlight = false, subtext = '', variance?: number) => (
        <div className={`flex justify-between items-center py-2 px-3 border-b border-[#333] ${highlight ? 'bg-[#252525]' : ''}`}>
            <div>
                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider">{label}</span>
                {subtext && <span className="text-gray-600 text-[10px] ml-2 font-mono">[{subtext}]</span>}
            </div>
            <div className="text-right">
                <span className={`font-mono font-bold text-sm ${highlight ? 'text-[#00FF94]' : 'text-gray-300'
                    }`}>
                    {value}
                </span>
                {variance !== undefined && (
                    <span className={`ml-2 text-[10px] font-mono ${variance > 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                        {variance > 0 ? '▲' : '▼'}{Math.abs(variance).toFixed(1)}%
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden w-full max-w-md shadow-lg shadow-black/50">
            {/* Header / Selector */}
            <div className="p-3 bg-[#121212] border-b border-[#333] flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-[#00FF94] rounded-full animate-pulse"></span>
                    <span className="text-white font-mono font-bold text-xs tracking-widest uppercase">Network Intel</span>
                </div>
                <div className="flex space-x-1">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="bg-[#222] border border-[#333] text-gray-300 text-[10px] font-mono rounded-none px-2 py-1 focus:outline-none focus:border-[#00FF94]"
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                    <select
                        value={week}
                        onChange={(e) => setWeek(Number(e.target.value))}
                        className="bg-[#222] border border-[#333] text-[#00FF94] font-bold text-[10px] font-mono rounded-none px-2 py-1 focus:outline-none focus:border-[#00FF94]"
                    >
                        {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                            <option key={w} value={w}>WK {w.toString().padStart(2, '0')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="p-0">
                {loading ? (
                    <div className="p-8 text-center text-gray-600 font-mono text-xs animate-pulse">ESTABLISHING UPLINK...</div>
                ) : data ? (
                    <div className="divide-y divide-[#333]">

                        {/* Weekly Specifics */}
                        <div className="bg-[#1a1a1a]">
                            {renderRow('Cost / Guest', `$${data.costPerGuest.toFixed(2)}`, true, true)}
                            {renderRow('Lbs / Guest', data.lbsPerGuest.toFixed(2), false, true)}
                            {renderRow('Plan Range', `${data.planLbsPerGuest.toFixed(2)}`, false, false, 'TARGET')}
                        </div>

                        {/* Trends */}
                        <div className="bg-[#151515]">
                            <div className="px-3 py-1 text-[9px] font-mono text-[#555] uppercase tracking-widest border-b border-[#333]">Rolling Trends</div>
                            {renderRow('12-Wk Avg', data.lbsPerGuest12UkAvg.toFixed(2))}
                            {renderRow('PTD Avg', data.lbsPerGuestPTD.toFixed(2))}
                            {renderRow('YTD Avg', data.lbsPerGuestYTD.toFixed(2))}
                        </div>

                        {/* YTD Impact */}
                        <div className="bg-[#1a1a1a]">
                            <div className="grid grid-cols-2">
                                <div className="p-3 border-r border-[#333]">
                                    <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">Plan YTD</div>
                                    <div className="text-gray-300 font-mono font-bold">{data.planLbsPerGuestYTD.toFixed(2)}</div>
                                </div>
                                <div className={`p-3 ${data.impactYTD < 0 ? 'bg-[#FF2A6D]/10' : 'bg-[#00FF94]/10'}`}>
                                    <div className={`text-[9px] font-mono uppercase mb-1 ${data.impactYTD < 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                        Financial Impact
                                    </div>
                                    <div className={`font-mono font-bold text-lg ${data.impactYTD < 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                                        {data.impactYTD < 0 ? '-' : '+'}${Math.abs(data.impactYTD).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-[#FF2A6D] font-mono text-xs border-l-2 border-[#FF2A6D]">Connection Failed</div>
                )}
            </div>
        </div>
    );
};
