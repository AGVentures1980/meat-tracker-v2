
import React, { useState, useEffect } from 'react';
import { Brain, Lock, Save, AlertTriangle, Calendar, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const ForecastPage = () => {
    const { user } = useAuth();
    const { t } = useLanguage();

    // State
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [lunchGuests, setLunchGuests] = useState<number>(0);
    const [dinnerGuests, setDinnerGuests] = useState<number>(0);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initialize with Next Week's Monday
    useEffect(() => {
        const nextMonday = new Date();
        nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
        setSelectedDate(nextMonday.toISOString().split('T')[0]);
    }, []);

    // Fetch Forecast when date changes
    useEffect(() => {
        if (!selectedDate || !user) return;

        const fetchForecast = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/v1/forecast/next-week?date=${selectedDate}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();

                if (data.success && data.forecast) {
                    setLunchGuests(data.forecast.forecast_lunch);
                    setDinnerGuests(data.forecast.forecast_dinner);
                    setIsLocked(data.forecast.is_locked);
                } else {
                    // Reset if no forecast found
                    setLunchGuests(0);
                    setDinnerGuests(0);
                    setIsLocked(false);
                }
            } catch (err) {
                console.error("Failed to fetch forecast", err);
            } finally {
                setLoading(false);
            }
        };

        fetchForecast();
    }, [selectedDate, user]);

    const handleSave = async () => {
        setMessage(null);
        setLoading(true);
        try {
            const res = await fetch('/api/v1/forecast/upsert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    week_start: selectedDate,
                    lunch_guests: lunchGuests,
                    dinner_guests: dinnerGuests
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Previsão salva com sucesso!' });
                if (data.forecast.is_locked) setIsLocked(true);
            } else {
                setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Falha de conexão.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <Brain className="w-8 h-8 text-[#C5A059]" />
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        {t('forecast_title') || 'Smart Forecasting'}
                    </h1>
                    <p className="text-gray-500 text-sm font-mono uppercase tracking-wider">
                        planejamento de demanda & compras
                    </p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-sm p-6 shadow-2xl relative overflow-hidden">
                {isLocked && (
                    <div className="absolute top-0 right-0 bg-[#FF2A6D] text-white text-[10px] font-bold px-3 py-1 flex items-center gap-1">
                        <Lock size={10} /> LOCKED
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Input Selection */}
                    <div>
                        <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
                            Semana de Referência (Segunda-Feira)
                        </label>
                        <div className="relative mb-6">
                            <Calendar className="absolute left-3 top-3 text-[#C5A059] w-4 h-4" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-[#121212] border border-[#333] text-white p-2 pl-10 rounded-sm focus:border-[#C5A059] focus:outline-none font-mono"
                            />
                        </div>

                        <div className="p-4 bg-[#252525] border border-[#333] rounded-sm mb-4">
                            <h3 className="text-gray-400 text-xs uppercase font-bold mb-2 flex items-center gap-2">
                                <AlertTriangle size={12} className="text-[#C5A059]" /> Regra de Bloqueio
                            </h3>
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                O forecast deve ser enviado até <strong>Quarta-Feira</strong> da semana anterior.
                                Após esse prazo, apenas o Diretor pode liberar alterações.
                                Isso garante que o sistema de compras (Smart Order) tenha tempo hábil para gerar os pedidos de Quinta/Sexta.
                            </p>
                        </div>
                    </div>

                    {/* Right: Guest Inputs */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1">
                                Previsão de Almoço
                            </label>
                            <input
                                type="number"
                                value={lunchGuests}
                                onChange={(e) => setLunchGuests(Number(e.target.value))}
                                disabled={isLocked}
                                className={`w-full bg-[#121212] border border-[#333] text-white text-xl font-bold p-3 rounded-sm focus:border-[#00FF94] focus:outline-none transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs uppercase tracking-widest mb-1">
                                Previsão de Jantar
                            </label>
                            <input
                                type="number"
                                value={dinnerGuests}
                                onChange={(e) => setDinnerGuests(Number(e.target.value))}
                                disabled={isLocked}
                                className={`w-full bg-[#121212] border border-[#333] text-white text-xl font-bold p-3 rounded-sm focus:border-[#00FF94] focus:outline-none transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="0"
                            />
                        </div>

                        <div className="pt-4 border-t border-[#333] flex justify-between items-center">
                            <div>
                                <p className="text-gray-500 text-[10px] uppercase">Total Guests</p>
                                <p className="text-2xl font-bold text-white">{lunchGuests + dinnerGuests}</p>
                            </div>

                            {!isLocked && (
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="bg-[#00FF94] hover:bg-[#00CC76] text-black font-bold uppercase text-xs px-6 py-3 rounded-sm flex items-center gap-2 transition-all active:scale-95"
                                >
                                    {loading ? 'Salvando...' : <><Save size={16} /> Confirmar Forecast</>}
                                </button>
                            )}
                            {isLocked && (
                                <button disabled className="bg-[#333] text-gray-500 font-bold uppercase text-xs px-6 py-3 rounded-sm flex items-center gap-2 cursor-not-allowed">
                                    <Lock size={16} /> Bloqueado
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`mt-4 p-3 text-xs font-bold uppercase tracking-wide border ${message.type === 'success' ? 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30' : 'bg-[#FF2A6D]/10 text-[#FF2A6D] border-[#FF2A6D]/30'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Smart Order Suggestions (Lazy Loaded after Save or Load) */}
            <SmartOrderTable date={selectedDate} refreshTrigger={loading} />
        </div>
    );
};

// Sub-component for Smart Order Table
const SmartOrderTable = ({ date, refreshTrigger }: { date: string, refreshTrigger: boolean }) => {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!date || !user) return;
        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/v1/intelligence/supply-suggestions?date=${date}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setSuggestions(data.suggestions);
                    setMeta({ accumulated_weight: data.accumulated_weight, day: data.day_index });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, [date, refreshTrigger, user]);

    if (!suggestions.length && !loading) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="mt-8 bg-[#1a1a1a] border border-[#333] rounded-sm p-6 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-700 print:shadow-none print:border-none print:p-0">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Truck className="text-[#00FF94]" /> Smart Order Sheet
                    </h2>
                    <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">
                        Sugestão Dinâmica (v4.0) • {meta ? `Consumo Estimado: ${(meta.accumulated_weight * 100).toFixed(0)}% da semana` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {loading && <div className="text-[#C5A059] text-xs font-mono animate-pulse">CALCULATING...</div>}
                    <button
                        onClick={handlePrint}
                        className="bg-[#333] hover:bg-[#444] text-white text-xs font-bold uppercase px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    >
                        <Calendar size={14} /> Imprimir Lista
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8">
                <h1 className="text-2xl font-bold text-black border-b-2 border-black pb-2">Smart Order Sheet</h1>
                <p className="text-sm mt-2">Week of: <strong>{date}</strong> | <span className="text-xs">Dynamic Inventory Active</span></p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse print:text-black">
                    <thead>
                        <tr className="border-b border-[#333] print:border-black text-gray-500 print:text-black text-[10px] uppercase tracking-widest">
                            <th className="p-3">Protein</th>
                            <th className="p-3 text-right text-gray-500">Last Ct</th>
                            <th className="p-3 text-right text-[#00FF94]">+ Recv</th>
                            <th className="p-3 text-right text-[#FF2A6D]">- Est. Usage</th>
                            <th className="p-3 text-right font-bold text-white border-r border-[#333] print:text-black print:border-black">Est. On Hand</th>

                            <th className="p-3 text-right text-[#C5A059] bg-[#C5A059]/5 print:bg-transparent">Mon (25%)</th>
                            <th className="p-3 text-right text-[#00FF94] bg-[#00FF94]/5 print:bg-transparent font-bold">Wed (50%)</th>
                            <th className="p-3 text-right text-[#C5A059] bg-[#C5A059]/5 print:bg-transparent">Sat (25%)</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-mono text-gray-300 print:text-black">
                        {suggestions.map((item, idx) => (
                            <tr key={idx} className="border-b border-[#333]/50 print:border-gray-300 hover:bg-[#252525] print:hover:bg-transparent transition-colors">
                                <td className="p-3 font-bold text-white print:text-black">{item.protein}</td>

                                {/* Dynamic Inventory Columns */}
                                <td className="p-3 text-right text-gray-500 text-xs">{item.lastCount?.toFixed(0)}</td>
                                <td className="p-3 text-right text-[#00FF94] text-xs">+{item.received?.toFixed(0)}</td>
                                <td className="p-3 text-right text-[#FF2A6D] text-xs">-{item.depletion?.toFixed(0)}</td>
                                <td className="p-3 text-right font-bold text-white border-r border-[#333] print:text-black print:border-black">
                                    {item.onHand?.toFixed(0)} <span className="text-[10px] text-gray-600 font-normal">lbs</span>
                                </td>

                                {/* Ordering Columns */}
                                <td className="p-3 text-right text-[#C5A059] print:text-black bg-[#C5A059]/5 print:bg-transparent">
                                    {item.breakdown?.mon?.toFixed(0)}
                                </td>
                                <td className="p-3 text-right text-[#00FF94] print:text-black bg-[#00FF94]/5 print:bg-transparent font-bold border-x border-[#333] print:border-gray-300">
                                    {item.breakdown?.wed?.toFixed(0)}
                                </td>
                                <td className="p-3 text-right text-[#C5A059] print:text-black bg-[#C5A059]/5 print:bg-transparent">
                                    {item.breakdown?.sat?.toFixed(0)}
                                </td>

                                <td className="p-3 text-center print:hidden">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'Order Needed' ? 'bg-[#00FF94]/20 text-[#00FF94]' : 'bg-gray-800 text-gray-500'}`}>
                                        {item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-3 bg-[#252525] print:bg-transparent border border-[#333] print:border-gray-300 rounded-sm flex items-center gap-3">
                <AlertTriangle size={14} className="text-[#C5A059] print:text-black" />
                <p className="text-[10px] text-gray-400 print:text-black">
                    <strong>Estoque Dinâmico:</strong> O sistema estimou o consumo de <strong>{(meta?.accumulated_weight * 100)?.toFixed(0)}%</strong> da semana até agora.
                    Verifique se todas as notas fiscais recentes foram lançadas para garantir a precisão.
                </p>
            </div>
        </div>
    );
};
