import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Network, AlertCircle, FileText, CheckCircle2, AlertTriangle, Archive } from 'lucide-react';

interface MatchResult {
    invoice: any;
    received: any;
    status: 'MATCHED' | 'DISCREPANCY' | 'PENDING' | 'EXCESS';
    variance_pct: number | null;
}

export const OutletInboundReconciliation: React.FC<{ outletSlug: string; KpiFlagsUpdate?: (flags: any) => void; }> = ({ outletSlug, KpiFlagsUpdate }) => {
    const { user } = useAuth();
    const [data, setData] = useState<{ matches: MatchResult[], reconciliation_pct: number } | null>(null);

    useEffect(() => {
        fetch(`/api/v1/enterprise/outlet/${outletSlug}/inbound-reconciliation?days=7`, {
            headers: { 'Authorization': `Bearer ${user?.token}` }
        })
        .then(res => res.json())
        .then(d => {
            if (d.success) {
                setData(d.data);
                if (d.data.reconciliation_pct < 80 && KpiFlagsUpdate) {
                    KpiFlagsUpdate({ hasReconFlag: true });
                }
            }
        });
    }, [outletSlug]);

    if (!data) return <div className="text-gray-500 loading-pulse p-4">Loading Inbound Integrity...</div>;

    const StatusBadge = ({ s }: { s: string }) => {
        if (s === 'MATCHED') return <span className="bg-green-900/40 text-green-400 border border-green-800 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3"/> MATCHED</span>;
        if (s === 'DISCREPANCY') return <span className="bg-red-900/40 text-red-500 border border-red-800 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3"/> DISCREPANCY</span>;
        if (s === 'PENDING') return <span className="bg-yellow-900/40 text-yellow-500 border border-yellow-800 text-[10px] px-2 py-0.5 rounded w-fit">PENDING</span>;
        return <span className="bg-orange-900/40 text-orange-400 border border-orange-800 text-[10px] px-2 py-0.5 rounded w-fit">EXCESS</span>;
    };

    return (
        <div className="bg-[#1a1a1a] rounded border border-[#333] overflow-hidden flex flex-col h-full">
            <div className="bg-[#222] p-3 border-b border-[#333] flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-orange-500" />
                    <h3 className="text-white font-bold tracking-widest uppercase text-sm">Inbound Reconciliation</h3>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded ${data.reconciliation_pct >= 80 ? 'bg-green-900/20 text-green-400 border border-green-800/50' : 'bg-red-900/20 text-red-500 border border-red-800/50'}`}>
                    {data.reconciliation_pct.toFixed(1)}% RECONCILED
                </div>
            </div>
            <div className="p-0 overflow-y-auto max-h-[300px]">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-[#111] text-xs uppercase tracking-widest text-gray-500 sticky top-0">
                        <tr>
                            <th className="p-3 font-normal">Invoice Item</th>
                            <th className="p-3 font-normal">Expected (Lbs)</th>
                            <th className="p-3 font-normal">Received (Lbs)</th>
                            <th className="p-3 font-normal">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                        {data.matches.map((m, i) => (
                            <tr key={i} className="hover:bg-[#222]/50 transition-colors">
                                <td className="p-3">
                                    <div className="font-bold text-white text-xs">{m.invoice?.item_name || 'Unknown'}</div>
                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{m.invoice?.invoice_number || 'No Invoice#'}</div>
                                </td>
                                <td className="p-3 text-xs">{m.invoice?.quantity?.toFixed(2)}</td>
                                <td className="p-3 text-xs font-mono">{m.received?.weight?.toFixed(2) ?? '--'}</td>
                                <td className="p-3 pt-4"><StatusBadge s={m.status} /></td>
                            </tr>
                        ))}
                        {data.matches.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    <Archive className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs tracking-widest uppercase">No inbound invoices mapped last 7 days</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
