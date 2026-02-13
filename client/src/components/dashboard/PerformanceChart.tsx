import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceChartProps {
    data: any[];
}

export const PerformanceChart = ({ data }: PerformanceChartProps) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-[500px] w-full bg-[#1a1a1a] border border-[#333] p-6 rounded-sm flex flex-col items-center justify-center">
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No Performance Data Available</p>
            </div>
        );
    }

    // Sort by variance to show best/worst performers
    const chartData = [...data]
        .filter(item => item && item.name)
        .sort((a, b) => (a.costGuestVar || 0) - (b.costGuestVar || 0))
        .map(item => {
            const rawVariance = typeof item.costGuestVar === 'number' ? item.costGuestVar : 0;
            const variance = !isNaN(rawVariance) ? rawVariance : 0;
            return {
                name: item.name,
                variance: parseFloat(variance.toFixed(2)),
                absVariance: Math.abs(variance)
            };
        });

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            return (
                <div className="bg-[#1a1a1a] border border-[#333] p-3 shadow-2xl font-mono">
                    <p className="text-[#C5A059] text-xs font-bold mb-1 uppercase tracking-wider">{label}</p>
                    <p className={`text-sm ${val > 0 ? 'text-[#FF2A6D]' : 'text-[#00FF94]'}`}>
                        VAR: {val > 0 ? '+' : ''}${val} / GUEST
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">
                        {val > 0 ? 'EXCEEDING TARGET' : 'BELOW TARGET'}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[500px] w-full bg-[#1a1a1a] border border-[#333] p-6 rounded-sm">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#C5A059]"></div> Economic Variance Analysis (Store vs Plan)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#666"
                        fontSize={10}
                        tick={{ fill: '#666' }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                    />
                    <YAxis
                        stroke="#666"
                        fontSize={10}
                        tick={{ fill: '#666' }}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="variance">
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.variance > 0 ? '#FF2A6D' : '#00FF94'}
                                fillOpacity={0.8}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
