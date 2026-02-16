import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface HealthMatrixItem {
    id: number;
    name: string;
    location: string;
    forecast: { status: 'Optimal' | 'Warning' | 'Critical', variance: number };
    waste: { status: 'Optimal' | 'Warning' | 'Critical', lastLog?: string };
    prep: { status: 'Optimal' | 'Warning' | 'Critical', lastLog?: string };
    inventory: { status: 'Optimal' | 'Warning' | 'Critical', impact: number };
    totalScore: number;
}

interface Props {
    data: HealthMatrixItem[];
    loading: boolean;
}

const StatusPill = ({ status, label, onClick }: { status: string, label?: string, onClick?: () => void }) => {
    let colorClass = 'bg-gray-800 text-gray-500';
    let icon = null;

    if (status === 'Optimal') {
        colorClass = 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/20';
        icon = <CheckCircle size={10} />;
    } else if (status === 'Warning') {
        colorClass = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
        icon = <Info size={10} />;
    } else if (status === 'Critical') {
        colorClass = 'bg-[#FF2A6D]/10 text-[#FF2A6D] border border-[#FF2A6D]/20 animate-pulse';
        icon = <AlertTriangle size={10} />;
    }

    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${colorClass} ${onClick ? 'cursor-pointer hover:bg-opacity-20' : 'cursor-default'}`}
        >
            {icon}
            {label || status}
        </button>
    );
};

export const NetworkHealthMatrix: React.FC<Props> = ({ data, loading }) => {
    const navigate = useNavigate();

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Scanning Network Protocols...</div>;

    const handleDrillDown = (storeId: number, module: string) => {
        if (module === 'forecast') {
            navigate(`/forecast?storeId=${storeId}`);
        } else if (module === 'waste') {
            navigate(`/waste?storeId=${storeId}`);
        } else if (module === 'inventory') {
            navigate(`/dashboard/${storeId}`);
        }
    };

    return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#151515]">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
                        Network Operational Health
                    </h3>
                    <p className="text-gray-500 text-xs">Real-time status of critical operational pillars</p>
                </div>
                <div className="text-right">
                    <span className="text-[#C5A059] font-mono text-xl font-bold">{data.length}</span>
                    <span className="text-gray-600 text-xs ml-1 uppercase">Active Locations</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#222] text-gray-500 text-[10px] uppercase tracking-widest font-mono">
                            <th className="p-4">Store</th>
                            <th className="p-4 text-center">Forecast Accuracy</th>
                            <th className="p-4 text-center">Waste Compliance</th>
                            <th className="p-4 text-center">Prep Efficiency</th>
                            <th className="p-4 text-center">Inventory/Var</th>
                            <th className="p-4 text-right">Health Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333]">
                        {data.map((store) => (
                            <tr key={store.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-white text-sm">{store.name}</div>
                                    <div className="text-gray-600 text-[10px]">{store.location}</div>
                                </td>

                                <td className="p-4 flex justify-center">
                                    <StatusPill
                                        status={store.forecast.status}
                                        label={store.forecast.status === 'Optimal' ? 'Accurate' : undefined}
                                        onClick={() => handleDrillDown(store.id, 'forecast')}
                                    />
                                </td>

                                <td className="p-4">
                                    <div className="flex justify-center">
                                        <StatusPill
                                            status={store.waste.status}
                                            label={store.waste.status === 'Critical' ? 'Missing Logs' : undefined}
                                            onClick={() => handleDrillDown(store.id, 'waste')}
                                        />
                                    </div>
                                </td>

                                <td className="p-4">
                                    <div className="flex justify-center">
                                        <StatusPill status={store.prep.status} />
                                    </div>
                                </td>

                                <td className="p-4">
                                    <div className="flex justify-center">
                                        <StatusPill
                                            status={store.inventory.status}
                                            label={store.inventory.impact > 1000 ? 'High Loss' : undefined}
                                        />
                                    </div>
                                </td>

                                <td className="p-4 text-right">
                                    <span className={`font-mono text-lg font-bold ${store.totalScore > 90 ? 'text-[#00FF94]' : store.totalScore > 75 ? 'text-yellow-500' : 'text-[#FF2A6D]'}`}>
                                        {store.totalScore}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
