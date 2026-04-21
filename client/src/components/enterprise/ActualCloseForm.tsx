import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ActualCloseFormProps {
    outletSlug: string;
    onSuccess?: () => void;
}

export const ActualCloseForm: React.FC<ActualCloseFormProps> = ({ outletSlug, onSuccess }) => {
    const { user } = useAuth();
    const [businessDate, setBusinessDate] = useState(new Date().toISOString().split('T')[0]);
    const [mealPeriod, setMealPeriod] = useState('ALL_DAY');
    const [actualGuests, setActualGuests] = useState<number | ''>('');
    const [lbsConsumed, setLbsConsumed] = useState<number | ''>('');
    const [status, setStatus] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setStatus('Submitting...');
            const res = await fetch(`/api/v1/enterprise/outlet/${outletSlug}/actual-close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    business_date: businessDate,
                    meal_period: mealPeriod,
                    actual_guests: actualGuests,
                    lbs_consumed: lbsConsumed
                })
            });

            if (res.ok) {
                setStatus('Close Out Completed Correctly');
                if (onSuccess) onSuccess();
            } else {
                const err = await res.json();
                setStatus(`Error: ${err.message}`);
            }
        } catch (err: any) {
            setStatus(`Error: ${err.message}`);
        }
    };

    return (
        <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
            <h3 className="font-bold text-[#00FF94] uppercase tracking-widest mb-4">Submit Actual Close</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Business Date</label>
                        <input 
                            type="date" 
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#00FF94]"
                            value={businessDate}
                            onChange={e => setBusinessDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Meal Period</label>
                        <select 
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#00FF94]"
                            value={mealPeriod}
                            onChange={e => setMealPeriod(e.target.value)}
                        >
                            <option value="ALL_DAY">All Day</option>
                            <option value="BREAKFAST">Breakfast</option>
                            <option value="LUNCH">Lunch</option>
                            <option value="DINNER">Dinner</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Actual Guests</label>
                        <input 
                            type="number" 
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#00FF94]"
                            value={actualGuests}
                            onChange={e => setActualGuests(e.target.value === '' ? '' : parseInt(e.target.value))}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Lbs Consumed</label>
                        <input 
                            type="number" 
                            step="0.01"
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#00FF94]"
                            value={lbsConsumed}
                            onChange={e => setLbsConsumed(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <button type="submit" className="bg-[#00FF94] text-black font-bold uppercase tracking-widest px-6 py-2 rounded hover:opacity-90 transition-opacity">
                        Submit Close
                    </button>
                    <span className={`text-sm tracking-widest ${status.includes('Error') ? 'text-red-500' : 'text-[#00FF94]'}`}>{status}</span>
                </div>
            </form>
        </div>
    );
};
