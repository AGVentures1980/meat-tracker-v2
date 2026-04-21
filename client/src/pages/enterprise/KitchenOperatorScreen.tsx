import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChefHat, Truck, Scissors, FileDigit, ScanBarcode, ArrowLeft } from 'lucide-react';

export const KitchenOperatorScreen = () => {
    const { outletSlug } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [context, setContext] = useState<string>('PREP_COOK'); // default

    useEffect(() => {
        // Resolve Subtype detection
        // If outlet.slug contains dock/commissary and type is KITCHEN
        if (outletSlug?.includes('dock')) {
            setContext('DOCK_RECEIVER');
        } else if (outletSlug?.includes('commissary')) {
            setContext('BUTCHER');
        } else {
            setContext('PREP_COOK');
        }
    }, [outletSlug]);

    const logout = () => {
        navigate('/login');
    };

    return (
        <div className="bg-black min-h-screen text-white flex flex-col font-mono">
            {/* Minimal Header */}
            <header className="bg-[#111] p-4 flex justify-between items-center border-b border-[#333]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/login')} className="p-3 bg-[#222] border border-[#333] hover:border-white rounded text-gray-400 hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-widest text-[#00FF94] uppercase">{context.replace('_', ' ')} terminal</h1>
                        <span className="text-xs text-gray-500 tracking-widest uppercase">ID: {user?.id?.slice(0,8)}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-gray-300">{new Date().toLocaleTimeString()}</div>
                </div>
            </header>

            <main className="flex-1 p-6">
                {context === 'DOCK_RECEIVER' && <DockReceiverView outletSlug={outletSlug!} />}
                {context === 'BUTCHER' && <ButcherView outletSlug={outletSlug!} />}
                {context === 'PREP_COOK' && <PrepCookView outletSlug={outletSlug!} />}
            </main>
        </div>
    );
};

const DockReceiverView = ({ outletSlug }: { outletSlug: string }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="bg-[#111] border border-[#333] rounded flex flex-col p-6">
                <div className="flex items-center gap-3 text-[#FF9F1C] mb-8">
                    <ScanBarcode className="w-8 h-8" />
                    <h2 className="text-2xl font-bold uppercase tracking-widest">Active Scan Input</h2>
                </div>
                
                <input 
                    type="text" 
                    autoFocus 
                    placeholder="SCAN GS1-128 BARCODE" 
                    className="w-full bg-[#222] border-2 border-[#555] focus:border-[#FF9F1C] text-white p-6 rounded text-2xl tracking-widest uppercase outline-none"
                />
                
                <div className="mt-8 space-y-4">
                    <div className="border border-[#333] p-4 flex items-center justify-between text-gray-400">
                        <span>Expected Boxes Today:</span>
                        <span className="text-xl font-bold text-white">45</span>
                    </div>
                    <div className="border border-[#333] p-4 flex items-center justify-between text-[#00FF94]">
                        <span>Boxes Scanned:</span>
                        <span className="text-xl font-bold">12</span>
                    </div>
                </div>

                <div className="mt-auto">
                    <button className="w-full bg-[#111] border-2 border-[#555] hover:border-[#FF9F1C] hover:text-[#FF9F1C] text-gray-400 p-6 uppercase tracking-widest font-bold text-xl transition-colors">
                        Close Shift Summary
                    </button>
                </div>
            </div>

            <div className="bg-[#111] border border-[#333] rounded p-6">
                <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-6">Last Scan Events</h2>
                <div className="space-y-4">
                    {[1,2,3,4,5].map((item) => (
                        <div key={item} className="flex justify-between items-center bg-[#222] p-4 border border-[#444]">
                            <div>
                                <div className="text-white font-bold text-lg">Picanha (Certified Angus)</div>
                                <div className="text-xs text-gray-500 mt-1">10:4{item} AM</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[#00FF94] text-xl font-bold">42.5 lbs</div>
                                <div className="text-[10px] text-green-500 uppercase">Received</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ButcherView = ({ outletSlug }: { outletSlug: string }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="bg-[#111] border border-[#333] rounded p-6">
                <div className="flex items-center gap-3 text-[#FF2A6D] mb-8">
                    <Scissors className="w-8 h-8" />
                    <h2 className="text-2xl font-bold uppercase tracking-widest">Yield Entry</h2>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-500 text-xs mb-2 tracking-widest uppercase">Protein Family</label>
                        <select className="w-full bg-[#222] border-2 border-[#555] text-white p-6 rounded text-xl uppercase outline-none">
                            <option>Picanha</option>
                            <option>Filet Mignon</option>
                            <option>Fraldinha</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-500 text-xs mb-2 tracking-widest uppercase">Input Lbs</label>
                            <input type="number" className="w-full bg-[#222] border-2 border-[#555] text-white p-6 rounded text-xl uppercase outline-none" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-gray-500 text-xs mb-2 tracking-widest uppercase">Output Lbs</label>
                            <input type="number" className="w-full bg-[#222] border-2 border-[#555] text-white p-6 rounded text-xl uppercase outline-none" placeholder="0.00" />
                        </div>
                    </div>
                    <button className="w-full bg-[#FF2A6D] text-white font-bold text-xl uppercase tracking-widest p-6 rounded hover:opacity-80">
                        Submit Yield Record
                    </button>
                </div>
            </div>

            <div className="bg-[#111] border border-[#333] rounded p-6">
                <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-6">Recent Yield Logs</h2>
                <div className="space-y-4">
                    {[1,2,3].map((item) => (
                        <div key={item} className="flex justify-between items-center bg-[#222] p-4 border border-[#444]">
                            <div>
                                <div className="text-white font-bold text-lg">Picanha Yield</div>
                                <div className="text-xs text-gray-500 mt-1">Efficiency: 82%</div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-sm">In: 50.0 lbs</div>
                                <div className="text-[#00FF94] text-sm font-bold">Out: 41.0 lbs</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PrepCookView = ({ outletSlug }: { outletSlug: string }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full pt-12">
            <div className="flex items-center gap-3 text-[#00FF94] mb-8">
                <ChefHat className="w-12 h-12" />
                <h2 className="text-3xl font-bold uppercase tracking-widest">Prep Cook Terminal</h2>
            </div>
            
            <div className="bg-[#111] border border-[#333] w-full max-w-2xl p-8 rounded">
                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-500 text-xs mb-2 tracking-widest uppercase">Scan or Select Item to Prep</label>
                        <input type="text" className="w-full bg-[#222] border-2 border-[#555] focus:border-[#00FF94] text-white p-6 rounded text-xl uppercase outline-none" placeholder="Protein Barcode / Name" />
                    </div>
                    <div>
                        <label className="block text-gray-500 text-xs mb-2 tracking-widest uppercase">Quantity Needed</label>
                        <input type="number" className="w-full bg-[#222] border-2 border-[#555] text-white p-6 rounded text-xl uppercase outline-none" placeholder="0 lbs" />
                    </div>
                    <button className="w-full bg-[#00FF94] text-black font-bold text-xl uppercase tracking-widest p-6 rounded hover:opacity-80">
                        Record Prep Execution
                    </button>
                </div>
            </div>
        </div>
    );
};
