import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ForecastSubmissionFormProps {
    outletSlug: string;
    onSuccess?: () => void;
}

export const ForecastSubmissionForm: React.FC<ForecastSubmissionFormProps> = ({ outletSlug, onSuccess }) => {
    const { user } = useAuth();
    const [businessDate, setBusinessDate] = useState(new Date().toISOString().split('T')[0]);
    const [mealPeriod, setMealPeriod] = useState('ALL_DAY');
    const [managerForecast, setManagerForecast] = useState<number | ''>('');
    const [reservationCount, setReservationCount] = useState<number | ''>('');
    const [status, setStatus] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setStatus('Submitting...');
            const res = await fetch(`/api/v1/enterprise/outlet/${outletSlug}/forecast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    business_date: businessDate,
                    meal_period: mealPeriod,
                    manager_forecast: managerForecast,
                    reservation_count: reservationCount === '' ? undefined : reservationCount
                })
            });

            if (res.ok) {
                setStatus('Forecast Submitted Successfully');
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
            <h3 className="font-bold text-[#C5A059] uppercase tracking-widest mb-4">Submit Daily Forecast</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Business Date</label>
                        <input 
                            type="date" 
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#C5A059]"
                            value={businessDate}
                            onChange={e => setBusinessDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Meal Period</label>
                        <select 
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#C5A059]"
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
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Manager Forecast</label>
                        <input 
                            type="number" 
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#C5A059]"
                            value={managerForecast}
                            onChange={e => setManagerForecast(e.target.value === '' ? '' : parseInt(e.target.value))}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Reservations (Optional)</label>
                        <input 
                            type="number" 
                            className="w-full bg-[#111] border border-[#333] rounded p-2 text-white outline-none focus:border-[#C5A059]"
                            value={reservationCount}
                            onChange={e => setReservationCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <button type="submit" className="bg-[#C5A059] text-black font-bold uppercase tracking-widest px-6 py-2 rounded hover:opacity-90 transition-opacity">
                        Submit
                    </button>
                    <span className={`text-sm tracking-widest ${status.includes('Error') ? 'text-red-500' : 'text-[#00FF94]'}`}>{status}</span>
                </div>
            </form>
        </div>
    );
};
