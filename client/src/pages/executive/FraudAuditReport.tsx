import React, { useState, useEffect } from 'react';
import { ShieldAlert, Download, Calendar, Loader2, Search, Building2, Clock, Box } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Assuming dates in simplified format for the UI
export const FraudAuditReport = () => {
    const { user } = useAuth();
    const [attempts, setAttempts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Default last 30 days
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const fetchAuditLogs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/compliance/master/fraud-audit?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAttempts(data.attempts || []);
            }
        } catch (error) {
            console.error('Error fetching comprehensive audit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) {
            fetchAuditLogs();
        }
    }, [user?.token, startDate, endDate]);

    const filteredAttempts = attempts.filter(att => 
        (att.store?.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (att.store?.store_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (att.protein_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (att.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (att.scanned_barcode || '').includes(searchTerm)
    );

    const exportToCSV = () => {
        const headers = ["Timestamp", "Company", "Store", "Protein Identity", "Supplier", "Weight Lbs", "Serial", "Raw Barcode"];
        
        const rows = filteredAttempts.map(att => [
            new Date(att.scanned_at).toLocaleString(),
            att.store?.company?.name || "Unknown",
            att.store?.store_name || "Unknown",
            att.protein_name || "Unidentified",
            att.supplier || "Unknown Logger",
            att.weight ? att.weight.toFixed(2) : "N/A",
            att.metadata?.serial || "N/A",
            `'${att.scanned_barcode}'` // Prefix with quote so excel doesn't truncate the leading zeros
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Bait_Switch_Global_Audit_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('landscape');
        
        doc.setFillColor(18, 18, 18);
        doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
        
        doc.setTextColor(197, 160, 89);
        doc.setFontSize(22);
        doc.text("GLOBAL FRAUD & BAIT-SWITCH AUDIT", 14, 22);
        
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Reporting Period: ${startDate} to ${endDate}`, 14, 35);
        
        const tableColumn = ["Date", "Company", "Store Location", "Detected Identity", "Supplier", "Raw Barcode Scanned"];
        const tableRows = filteredAttempts.map(att => [
            new Date(att.scanned_at).toLocaleString(),
            att.store?.company?.name || "N/A",
            att.store?.store_name || "N/A",
            att.protein_name || "Unidentified",
            att.supplier || "N/A",
            att.scanned_barcode
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: {
                fillColor: [30, 30, 30],
                textColor: [200, 200, 200],
                borderColor: [60, 60, 60]
            },
            headStyles: {
                fillColor: [200, 40, 70],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [22, 22, 22]
            }
        });

        doc.save(`Global_Fraud_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-slate-900/40 p-8 rounded-2xl border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.05)] backdrop-blur-xl">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-rose-500" />
                        Global Fraud & Bait-Switch Audit
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-2xl">
                        Network-wide security log detailing unauthorized meat interceptions at the receiving dock.
                        Filtered explicitly by Company and Organization.
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-mono tracking-widest uppercase">Start Date</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-mono tracking-widest uppercase">End Date</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-rose-500 focus:border-rose-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        placeholder="Search By Company, Location, or Protein..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-800/80 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg w-80 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                    />
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button 
                        onClick={exportToPDF}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                    >
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Master Table */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden glass-effect">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Organization & Store</th>
                                <th className="px-6 py-4">Analyzed Profile</th>
                                <th className="px-6 py-4">Scanned Origin Source</th>
                                <th className="px-6 py-4 text-right">Physical Wedge Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                        <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4 text-rose-500" />
                                        Pulling Master Network Logs...
                                    </td>
                                </tr>
                            ) : filteredAttempts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                                        No unauthorized scans detected in this timeframe. Rest easy.
                                    </td>
                                </tr>
                            ) : filteredAttempts.map((attempt) => (
                                <tr key={attempt.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                                            {new Date(attempt.scanned_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-white font-bold tracking-wide flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                                {attempt.store?.company?.name || "Global Network"}
                                            </span>
                                            <span className="text-xs text-slate-400">{attempt.store?.store_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-rose-400 font-semibold">{attempt.protein_name || "Unidentified Anomalous"}</span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                               <Box className="w-3 h-3" />
                                               {attempt.weight ? `${attempt.weight.toFixed(2)} LBS` : "No Weight Detected"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded w-fit text-slate-300">
                                                {attempt.supplier || "Supplier Missing"}
                                            </span>
                                            {attempt.metadata?.serial && (
                                                <span className="text-xs text-slate-500 font-mono bg-slate-900 px-1.5 rounded w-fit">
                                                    L/N: {attempt.metadata.serial}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-mono text-rose-500/90 bg-rose-500/10 px-2 py-1.5 rounded border border-rose-500/20 text-xs inline-block max-w-[240px] truncate" title={attempt.scanned_barcode}>
                                            {attempt.scanned_barcode}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    );
}
