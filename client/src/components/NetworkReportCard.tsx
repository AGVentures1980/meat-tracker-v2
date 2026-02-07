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

export const NetworkReportCard = () => {
    const [year, setYear] = useState(2026);
    const [week, setWeek] = useState(9);
    const [data, setData] = useState<ReportCardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3000/api/v1';
            const res = await fetch(`${baseUrl}/dashboard/bi-report-card?year=${year}&week=${week}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [year, week]);

    // Helpers for rendering rows
    const renderRow = (label: string, value: string | number, isCurrency = false, highlight = false, subtext = '') => (
        <div className={`flex justify-between items-center py-2 px-3 border-b border-white/5 ${highlight ? 'bg-white/5' : ''}`}>
            <div>
                <span className="text-gray-400 font-medium text-xs uppercase tracking-wide">{label}</span>
                {subtext && <span className="text-gray-600 text-[10px] ml-2">{subtext}</span>}
            </div>
            <span className={`font-mono font-bold ${highlight ? 'text-white' : 'text-gray-300'}`}>
                {value}
            </span>
        </div>
    );

    return (
        <div className="bg-[#1E1E1E] rounded-xl border border-white/5 overflow-hidden w-full max-w-sm">
            {/* Header / Selector */}
            <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-brand-gold" />
                    <span className="text-brand-gold font-serif font-bold tracking-wide">Weekly Report</span>
                </div>
                <div className="flex space-x-2">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="bg-black border border-white/20 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-brand-gold"
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                    <select
                        value={week}
                        onChange={(e) => setWeek(Number(e.target.value))}
                        className="bg-black border border-white/20 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-brand-gold"
                    >
                        {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                            <option key={w} value={w}>Wk {w}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="p-0">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 text-xs">Loading Week {week}...</div>
                ) : data ? (
                    <div className="divide-y divide-white/5">

                        {/* Weekly Specifics */}
                        <div className="bg-blue-900/10">
                            {renderRow('Cost / Guest Week', `$${data.costPerGuest.toFixed(2)}`, true, true)}
                            {renderRow('Lbs / Guest Week', data.lbsPerGuest.toFixed(2), false, true)}
                            {renderRow('Lbs / Guest Plan Week', data.planLbsPerGuest.toFixed(2))}
                        </div>

                        {/* Trends */}
                        <div>
                            {renderRow('Lbs / Guest - 12-Wk Avg', data.lbsPerGuest12UkAvg.toFixed(2))}
                            {renderRow('Lbs / Guest PTD', data.lbsPerGuestPTD.toFixed(2))}
                            {renderRow('Lbs / Guest YTD', data.lbsPerGuestYTD.toFixed(2))}
                        </div>

                        {/* YTD Impact */}
                        <div className="bg-red-900/10">
                            {renderRow('Lbs / Guest Plan YTD', data.planLbsPerGuestYTD.toFixed(2))}
                            <div className="flex justify-between items-center py-3 px-3 border-t-2 border-brand-red/20 bg-brand-red/5">
                                <span className="text-brand-red font-bold text-xs uppercase tracking-wide">Var to Plan Impact $ YTD</span>
                                <span className="font-mono font-bold text-brand-red text-lg">
                                    ${data.impactYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>

                        <div className="p-3">
                            <p className="text-[10px] text-gray-500 italic">* Excludes pre-opening usage</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-red-400">Failed to load data</div>
                )}
            </div>
        </div>
    );
};
