import { useState } from 'react';
import { Save, DollarSign, TrendingDown, TrendingUp, Loader2, ChevronLeft, ChevronRight, Lock } from 'lucide-react';


export const WeeklyPriceInput = () => {
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Mock Data State - In real app, fetch from DB based on selectedDate
    const [prices, setPrices] = useState([
        { id: 1, item: 'Picanha', current: 9.14, last: 9.00, unit: 'lb' },
        { id: 2, item: 'Fraldinha/Flank Steak', current: 8.24, last: 8.00, unit: 'lb' },
        { id: 3, item: 'Tri-Tip', current: 5.26, last: 5.20, unit: 'lb' },
        { id: 4, item: 'Filet Mignon', current: 9.50, last: 9.30, unit: 'lb' },
        { id: 5, item: 'Beef Ribs', current: 8.36, last: 8.20, unit: 'lb' },
        { id: 6, item: 'Pork Ribs', current: 2.80, last: 2.75, unit: 'lb' },
        { id: 7, item: 'Pork Loin', current: 2.47, last: 2.40, unit: 'lb' },
        { id: 8, item: 'Chicken Drumstick', current: 1.37, last: 1.35, unit: 'lb' },
        { id: 9, item: 'Chicken Breast', current: 1.47, last: 1.45, unit: 'lb' },
        { id: 10, item: 'Lamb Chops', current: 13.91, last: 13.50, unit: 'lb' },
        { id: 11, item: 'Leg of Lamb', current: 6.21, last: 6.00, unit: 'lb' },
        { id: 12, item: 'Lamb Picanha', current: 9.20, last: 9.00, unit: 'lb' },
        { id: 13, item: 'Sausage', current: 3.16, last: 3.10, unit: 'lb' },
        { id: 15, item: 'Bone-in Ribeye', current: 12.50, last: 12.00, unit: 'lb' },
        { id: 16, item: 'Pork Belly', current: 4.50, last: 4.20, unit: 'lb' },
        { id: 17, item: 'Bacon', current: 3.33, last: 3.30, unit: 'lb' }
    ]);

    const handlePriceChange = (id: number, newVal: string) => {
        setPrices(prices.map(p => p.id === id ? { ...p, current: parseFloat(newVal) || 0 } : p));
    };

    const handleSave = async () => {
        setLoading(true);
        // Simulate API Call
        await new Promise(r => setTimeout(r, 1000));
        setLoading(false);
        alert('Weekly Prices Updated! Financial reports will now reflect these costs.');
    };

    // Helper to get week range relative to any date
    const getWeekRange = (baseDate: Date) => {
        const currentDay = baseDate.getDay(); // 0=Sun, 1=Mon, etc.
        const diffToMon = currentDay === 0 ? -6 : 1 - currentDay; // If Sun(0), go back 6 days. Else go back to Mon(1).

        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
            text: `${format(monday)} - ${format(sunday)}`,
            start: monday,
            end: sunday
        };
    };

    const weekRange = getWeekRange(selectedDate);

    // Logic: Locked if the END of the selected week is in the past relative to TODAY
    const isLocked = weekRange.end < new Date();

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-[#C5A059] mb-2">Weekly Protein Pricing</h1>
                    <p className="text-gray-400">Input current market prices to calc savings & waste costs.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="bg-[#1a1a1a] px-4 py-2 rounded border border-white/10 text-right flex items-center gap-4">
                        <button onClick={() => navigateWeek('prev')} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white">
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div>
                            <div className="text-xs text-gray-500 uppercase">Effective Date (Mon-Sun)</div>
                            <div className="text-white font-mono flex items-center gap-2 justify-center">
                                {weekRange.text}
                                {isLocked && <Lock className="w-3 h-3 text-red-400" />}
                            </div>
                        </div>

                        <button onClick={() => navigateWeek('next')} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    {isLocked && <div className="text-xs text-red-400 font-mono uppercase tracking-widest">Read Only Mode</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-16 h-16 text-white" />
                    </div>
                    <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Total Market Variance</div>
                    <div className="text-2xl font-mono text-red-400 flex items-center gap-2">
                        +4.2% <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Prices are trending up vs last week.</p>
                </div>

                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingDown className="w-16 h-16 text-green-400" />
                    </div>
                    <div className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Projected Impact</div>
                    <div className="text-2xl font-mono text-white">
                        -$1,240
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Est. cost increase at current volume.</p>
                </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#C5A059]" />
                        Protein Market Rates
                    </h3>
                    <span className="text-xs text-gray-500 italic">Last updated: Today, 9:00 AM</span>
                </div>

                <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 gap-4 p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-5">Item Name</div>
                        <div className="col-span-2 text-right">Last Wk</div>
                        <div className="col-span-3 text-right">Current Price ($)</div>
                        <div className="col-span-2 text-right">Trend</div>
                    </div>

                    {prices.map((item) => {
                        const diff = item.current - item.last;
                        const pct = (diff / item.last) * 100;
                        const isUp = diff > 0;

                        return (
                            <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                                <div className="col-span-5 font-medium text-white">{item.item}</div>
                                <div className="col-span-2 text-right text-gray-500 font-mono">${item.last.toFixed(2)}</div>
                                <div className="col-span-3 flex justify-end">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={item.current}
                                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                            disabled={isLocked}
                                            className={`w-24 bg-black/50 border border-white/10 rounded py-1 pl-6 pr-2 text-right text-white font-mono outline-none transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : 'focus:border-[#C5A059]'}`}
                                        />
                                    </div>
                                </div>
                                <div className={`col-span-2 text-right text-xs font-bold flex items-center justify-end gap-1 ${isUp ? 'text-red-400' : 'text-green-400'}`}>
                                    {Math.abs(pct).toFixed(1)}%
                                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-white/5 bg-black/40 flex justify-end">
                    {isLocked ? (
                        <button
                            disabled
                            className="bg-[#333] text-gray-500 font-bold py-2 px-6 rounded shadow-none cursor-not-allowed flex items-center gap-2"
                        >
                            <Lock className="w-4 h-4" />
                            Locked (Effective Date Passed)
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold py-2 px-6 rounded shadow-lg shadow-[#C5A059]/20 flex items-center gap-2 transition-all transform hover:scale-105"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Update Prices
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

