import { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProposalData {
    title: string;
    recipient: string;
    sender: string;
    date: string;
    summary: string;
    highlights: string[];
    requirements: {
        item: string;
        volume: number;
        unit: string;
        notes: string;
    }[];
}

export const ProposalPreview = ({ onClose }: { onClose: () => void }) => {
    const { user } = useAuth();
    const [data, setData] = useState<ProposalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSent, setIsSent] = useState(false);

    useEffect(() => {
        const fetchProposal = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch('/api/v1/negotiation/proposal', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (res.ok) {
                    const result = await res.json();
                    setData(result.proposal);
                }
            } catch (err) {
                console.error("Failed to fetch proposal", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProposal();
    }, [user?.token]);

    const handlePrint = () => {
        window.print();
    };

    const handleSend = () => {
        setLoading(true);
        // Simulate sending
        setTimeout(() => {
            setLoading(false);
            setIsSent(true);
        }, 1500);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Generating Strategic Proposal...</p>
                </div>
            </div>
        );
    }

    if (isSent) {
        return (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[150] flex items-center justify-center p-6">
                <div className="bg-[#1a1a1a] border border-[#333] p-12 text-center max-w-md shadow-2xl">
                    <CheckCircle className="w-16 h-16 text-[#00FF94] mx-auto mb-6" />
                    <h2 className="text-2xl font-mono font-bold text-white mb-2">PROPOSAL DISPATCHED</h2>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        The annual volume commitment has been sent to the procurement hub. A copy has been archived in the executive records.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full bg-brand-gold hover:bg-yellow-500 text-black font-bold py-3 font-mono text-sm transition-all"
                    >
                        RETURN TO DASHBOARD
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/95 z-[150] flex flex-col pt-4 overflow-hidden">
            {/* Header Control Bar */}
            <div className="container mx-auto px-6 mb-4 flex justify-between items-center print:hidden">
                <button
                    onClick={onClose}
                    className="flex items-center text-gray-400 hover:text-white transition-colors font-mono text-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> EXIT PREVIEW
                </button>
                <div className="flex gap-4">
                    <button
                        onClick={handlePrint}
                        className="bg-[#222] border border-[#333] text-white px-4 py-2 font-mono text-xs flex items-center hover:bg-[#333] transition-colors"
                    >
                        <Printer className="w-4 h-4 mr-2 text-brand-gold" /> PRINT / EXPORT PDF
                    </button>
                    <button
                        onClick={handleSend}
                        className="bg-brand-gold text-black px-6 py-2 font-mono font-bold text-xs flex items-center hover:bg-yellow-500 transition-colors shadow-[0_0_15px_rgba(197,160,89,0.3)]"
                    >
                        <Send className="w-4 h-4 mr-2" /> SEND TO PROCUREMENT
                    </button>
                </div>
            </div>

            {/* Document Preview Area */}
            <div className="flex-1 overflow-auto bg-gray-900/50 p-6 print:p-0 print:bg-white">
                <div className="max-w-[850px] mx-auto bg-white text-black p-12 shadow-2xl min-h-[1100px] font-serif print:shadow-none print:p-0">

                    {/* Official Letterhead */}
                    <div className="border-b-4 border-black pb-8 mb-12 flex justify-between items-end">
                        <div className="font-sans">
                            <h1 className="text-4xl font-black tracking-tighter leading-none">BRASA INTEL</h1>
                            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 mt-1">ALEX GARCIA VENTURES • EXECUTIVE PROCUREMENT</p>
                        </div>
                        <div className="text-right font-sans text-xs">
                            <p className="font-bold">Confidential Business Document</p>
                            <p className="text-gray-500">REF: AGV-NEG-2027</p>
                        </div>
                    </div>

                    <div className="mb-12">
                        <div className="flex justify-between text-sm mb-8">
                            <div>
                                <h3 className="uppercase font-bold text-xs text-gray-500 mb-2">Prepared For:</h3>
                                <p className="font-bold text-lg">{data?.recipient}</p>
                                <p className="text-gray-600">Primary Vendor Hub</p>
                            </div>
                            <div className="text-right">
                                <h3 className="uppercase font-bold text-xs text-gray-500 mb-2">Prepared By:</h3>
                                <p className="font-bold text-lg">{data?.sender}</p>
                                <p>{data?.date}</p>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold border-l-8 border-black pl-6 my-12 uppercase leading-tight italic">
                            {data?.title}
                        </h2>

                        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-lg mb-12">
                            <p>{data?.summary}</p>
                        </div>

                        <div className="bg-gray-100 p-8 mb-12">
                            <h3 className="font-bold uppercase text-xs tracking-widest mb-6 flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2" /> Strategic Commitments
                            </h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data?.highlights.map((h, i) => (
                                    <li key={i} className="flex items-start text-sm">
                                        <span className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                                        {h}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <h3 className="font-bold uppercase text-xs tracking-widest mb-6">Aggregate Network Requirements</h3>
                        <table className="w-full text-left mb-12 border-t-2 border-b-2 border-black">
                            <thead>
                                <tr className="text-xs uppercase font-bold text-gray-500 border-b border-gray-200">
                                    <th className="py-4">Item Identification</th>
                                    <th className="py-4 text-right">Projected Load</th>
                                    <th className="py-4 pl-8">Unit</th>
                                    <th className="py-4">Logistics Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data?.requirements.map((req, i) => (
                                    <tr key={i} className="text-sm">
                                        <td className="py-4 font-bold" style={{ textTransform: 'uppercase' }}>{req.item}</td>
                                        <td className="py-4 text-right font-mono">{req.volume.toLocaleString()}</td>
                                        <td className="py-4 pl-8 font-bold text-xs">{req.unit}</td>
                                        <td className="py-4 text-xs text-gray-600 italic">{req.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t-2 border-dashed border-gray-300 pt-12 mt-12 grid grid-cols-2 gap-24 font-sans">
                            <div className="border-t border-black pt-4">
                                <p className="text-[10px] uppercase font-bold mb-8">Authorized AGV Signature</p>
                                <p className="text-xs font-serif italic text-gray-400">Electronic Verification Pending</p>
                            </div>
                            <div className="border-t border-black pt-4">
                                <p className="text-[10px] uppercase font-bold mb-8">Vendor Acceptance Signature</p>
                                <p className="text-xs font-serif italic text-gray-400">Placeholder for Recipient</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-12 text-[9px] text-gray-400 font-sans uppercase tracking-[0.1em] text-center border-t border-gray-100 italic">
                        Brasa Intel Strategic Suite • Generated via Autonomous Negotiator Engine v2.6.2-NEGOTIATOR
                    </div>

                </div>
            </div>
        </div>
    );
};
