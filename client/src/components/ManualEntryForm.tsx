
import React, { useState } from 'react';
import { PROTEIN_MAP } from '../lib/constants';

interface ManualEntryFormProps {
    onSubmit: (data: { type: string; lbs: number; date: string }) => void;
    onClose: () => void;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onSubmit, onClose }) => {
    // Get keys from PROTEIN_MAP for the dropdown
    const meatOptions = Object.keys(PROTEIN_MAP);

    const [type, setType] = useState(meatOptions[0]);
    const [lbs, setLbs] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            type,
            lbs: parseFloat(lbs),
            date
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs uppercase text-gray-400 mb-1 font-bold">Meat Type</label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-gold outline-none"
                    required
                >
                    {meatOptions.map((meatName) => (
                        <option key={meatName} value={meatName}>{meatName}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs uppercase text-gray-400 mb-1 font-bold">Quantity (lbs)</label>
                <input
                    type="number"
                    step="0.1"
                    required
                    value={lbs}
                    onChange={(e) => setLbs(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-gold outline-none"
                    placeholder="e.g. 45.5"
                />
            </div>

            <div>
                <label className="block text-xs uppercase text-gray-400 mb-1 font-bold">Date</label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-brand-gold outline-none"
                />
            </div>

            <button
                type="submit"
                className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-all mt-4"
            >
                Submit Entry
            </button>
        </form>
    );
};
