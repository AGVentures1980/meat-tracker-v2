import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrainCircuit, User as UserIcon, CheckCircle2, AlertCircle, Scale } from 'lucide-react';

export const ProcurementShadowDashboard: React.FC = () => {
    const { user } = useAuth();
    // Use native JS date for today's initialization
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [customVals, setCustomVals] = useState<Record<string, { lbs: string, skewers: string }>>({});

    useEffect(() => {
        fetchDashboardData();
    }, [date]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/intelligence/procurement-shadow?date=${date}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch shadow data:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitFeedback = async (
        storeId: number,
        protein: string,
        winner: 'AI' | 'MANAGER' | 'CUSTOM',
        proteinData: any
    ) => {
        try {
            let customLbs = null;
            let customSkewers = null;

            if (winner === 'CUSTOM') {
                const cLbs = parseFloat(customVals[`${storeId}-${protein}`]?.lbs);
                const cSkewers = parseFloat(customVals[`${storeId}-${protein}`]?.skewers);
                if (isNaN(cLbs) || isNaN(cSkewers)) {
                    alert('Please enter valid custom numbers for Lbs and Skewers');
                    return;
                }
                customLbs = cLbs;
                customSkewers = cSkewers;
            }

            const payload = {
                store_id: storeId,
                date: date,
                protein: protein,
                manager_prep_lbs: proteinData.manager_prep_lbs,
                ai_predicted_lbs: proteinData.ai_predicted_lbs,
                manager_prep_skewers: proteinData.ai_predicted_skewers,
                ai_predicted_skewers: proteinData.ai_predicted_skewers,
                chosen_winner: winner,
                custom_correct_lbs: customLbs,
                custom_correct_skewers: customSkewers
            };

            const response = await fetch('/api/v1/intelligence/procurement-feedback', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Refresh data to show the selection
                fetchDashboardData();
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        }
    };

    const handleCustomChange = (storeId: number, protein: string, field: 'lbs' | 'skewers', value: string) => {
        setCustomVals(prev => ({
            ...prev,
            [`${storeId}-${protein}`]: {
                ...prev[`${storeId}-${protein}`],
                [field]: value
            }
        }));
    };

    const allowedEmails = ['alexandre@alexgarciaventures.co', 'dallas@texasdebrazil.com'];
    if (!allowedEmails.includes(user?.email?.toLowerCase().trim())) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Classified Area</h2>
                    <p className="text-gray-500 mt-2">Access restricted to AGV Ventures Executive Level.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-xl border border-brand-gold/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <BrainCircuit className="w-48 h-48" />
                </div>
                <div className="relative z-10 w-full">
                    <div className="flex justify-between items-end w-full">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-gold/10 text-brand-gold border border-brand-gold">SHADOW MODE</span>
                                <span className="text-xs text-gray-400 font-mono">CLASSIFIED: EXECUTIVE ONLY</span>
                            </div>
                            <h1 className="text-3xl font-bold font-serif tracking-tight">AI Procurement Core</h1>
                            <p className="text-gray-400 mt-2 max-w-2xl">
                                Monitoring Manager preparation decisions against algorithmic yield models. Use this dashboard to supervise and calibrate the AI's predictive capabilities before the 90-day integration phase.
                            </p>
                        </div>
                        <div>
                            <input
                                type="date"
                                value={date}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                                className="bg-gray-800 border bg-gray-900 border-gray-700 rounded-md text-white px-4 text-lg py-3 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {data?.stores?.map((store: any) => (
                        <div key={store.store_id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{store.store_name}</h3>
                                        <div className="flex items-center space-x-4 mt-1">
                                            <span className="text-sm text-gray-500">Guest Forecast: <strong className="text-brand-gold">{store.forecast_guests}</strong></span>
                                            {store.has_manager_log ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">Prep Log Submitted</span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-600 border border-yellow-200 dark:border-yellow-800/50">Waiting for Prep Log</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-0">
                                {store.proteins && store.proteins.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                    <th className="px-4 py-3 text-left font-medium">Protein</th>
                                                    <th className="px-4 py-3 text-center border-l dark:border-gray-700">
                                                        <div className="flex items-center justify-center space-x-2 text-brand-gold">
                                                            <BrainCircuit className="w-4 h-4" />
                                                            <span>AI Suggestion</span>
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-center border-l dark:border-gray-700">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <UserIcon className="w-4 h-4" />
                                                            <span>Manager Call</span>
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-center border-l dark:border-gray-700 font-medium">
                                                        Calibration Action
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-gray-800">
                                                {store.proteins.map((p: any) => {
                                                    const aiWon = p.feedback?.chosen_winner === 'AI';
                                                    const managerWon = p.feedback?.chosen_winner === 'MANAGER';
                                                    const customWon = p.feedback?.chosen_winner === 'CUSTOM';
                                                    const isResolved = !!p.feedback;

                                                    return (
                                                        <tr key={p.protein} className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${isResolved ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                                                            <td className="px-4 py-4 font-medium dark:text-gray-200">
                                                                {p.protein}
                                                                <div className="text-xs text-gray-400 mt-1">~{p.lbs_per_skewer} lbs / skewer</div>
                                                            </td>

                                                            {/* AI COLUMN */}
                                                            <td className={`px-4 py-4 text-center border-l dark:border-gray-700 ${aiWon ? 'bg-brand-gold/10 font-bold' : ''}`}>
                                                                <div className="text-lg text-brand-gold">{p.ai_predicted_skewers > 0 ? p.ai_predicted_skewers.toFixed(1) : 0} Espetos</div>
                                                                <div className="text-xs text-gray-500">{p.ai_predicted_lbs > 0 ? p.ai_predicted_lbs.toFixed(1) : 0} Lbs</div>
                                                            </td>

                                                            {/* MANAGER COLUMN */}
                                                            <td className={`px-4 py-4 text-center border-l dark:border-gray-700 ${managerWon ? 'bg-blue-500/10 font-bold' : ''}`}>
                                                                <div className="text-lg text-blue-600 dark:text-blue-400">{p.manager_prep_skewers > 0 ? p.manager_prep_skewers.toFixed(1) : 0} Espetos</div>
                                                                <div className="text-xs text-gray-500">{p.manager_prep_lbs > 0 ? p.manager_prep_lbs.toFixed(1) : 0} Lbs</div>
                                                            </td>

                                                            {/* ACTION COLUMN */}
                                                            <td className="px-4 py-4 border-l dark:border-gray-700">
                                                                {isResolved ? (
                                                                    <div className="flex flex-col items-center justify-center space-y-2">
                                                                        <div className="flex items-center text-green-600 justify-center">
                                                                            <CheckCircle2 className="w-5 h-5 mr-2" />
                                                                            <span className="font-semibold text-sm">
                                                                                Verified: {aiWon ? 'AI Model' : managerWon ? 'Manager' : `Custom (${p.feedback.custom_correct_skewers} E / ${p.feedback.custom_correct_lbs} Lbs)`}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col space-y-2">
                                                                        <div className="flex justify-center space-x-2">
                                                                            <button
                                                                                className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-black h-8 px-3 transition-colors"
                                                                                onClick={() => submitFeedback(store.store_id, p.protein, 'AI', p)}
                                                                            >
                                                                                <Scale className="w-3 h-3 mr-1" />
                                                                                AI is Right
                                                                            </button>
                                                                            <button
                                                                                className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-600 h-8 px-3 transition-colors"
                                                                                onClick={() => submitFeedback(store.store_id, p.protein, 'MANAGER', p)}
                                                                            >
                                                                                <UserIcon className="w-3 h-3 mr-1" />
                                                                                Manager is Right
                                                                            </button>
                                                                        </div>
                                                                        <div className="pt-2 border-t dark:border-gray-700 mt-2 flex flex-col items-center">
                                                                            <span className="text-xs text-gray-500 mb-1">Override (Neither was right)</span>
                                                                            <div className="flex space-x-2">
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="Espetos"
                                                                                    className="h-8 w-20 text-xs bg-transparent border border-gray-300 dark:border-gray-700 rounded-md px-2 focus:outline-none focus:border-brand-gold"
                                                                                    value={customVals[`${store.store_id}-${p.protein}`]?.skewers || ''}
                                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomChange(store.store_id, p.protein, 'skewers', e.target.value)}
                                                                                />
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="Lbs"
                                                                                    className="h-8 w-20 text-xs bg-transparent border border-gray-300 dark:border-gray-700 rounded-md px-2 focus:outline-none focus:border-brand-gold"
                                                                                    value={customVals[`${store.store_id}-${p.protein}`]?.lbs || ''}
                                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomChange(store.store_id, p.protein, 'lbs', e.target.value)}
                                                                                />
                                                                                <button
                                                                                    className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 h-8 px-3 transition-colors"
                                                                                    onClick={() => submitFeedback(store.store_id, p.protein, 'CUSTOM', p)}
                                                                                >
                                                                                    Set
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        No proteins to compare for this day. Manager may not have submitted a log yet, or targets are missing.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
