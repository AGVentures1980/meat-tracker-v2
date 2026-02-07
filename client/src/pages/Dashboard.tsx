
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { Modal } from '../components/Modal';
import { StorePerformanceTable } from '../components/StorePerformanceTable';
import { NetworkReportCard } from '../components/NetworkReportCard';
import { WeeklyInputForm } from '../components/WeeklyInputForm';
import { LucideIcon, Scale, Users, Trophy, Activity, LogOut, LayoutGrid, PlusCircle, Upload, Camera, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface DashboardStats {
    totalLbsMonth: number;
    extraCustomers: number;
    dailyAverage: number;
    projectedTotal: number;
    topMeats: {
        name: string;
        value: number;
        actualPerGuest: number;
        goalPerGuest: number;
        variance: number;
    }[];
    weeklyChart: any[];
}

export const Dashboard = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showManualModal, setShowManualModal] = useState(false);
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    const COLORS = ['#D4AF37', '#8B0000', '#333333']; // Gold, Red, Dark Gray

    const fetchStats = async () => {
        if (!user || !user.id) return;
        try {
            // Fetch from our new API
            const storeId = isNaN(parseInt(user.id)) ? 180 : user.id;
            const response = await fetch(`/api/v1/dashboard/${storeId}`, {
                headers: { 'Authorization': 'Bearer mock-token' }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user]);

    const handleManualSubmit = async (data: { type: string; lbs: number; date: string }) => {
        try {
            const response = await fetch('/api/v1/orders', {
                const fetchData = async () => {
                    try {
                        // In production, fetch from /api/v1/dashboard/bi-table
                        // For prototype, we mock valid data if API fails or for first render
                        setLoading(false);
                        // Mock Data for Table Visualization
                        setPerformanceData([
                            { id: 101, name: 'Miami Beach', location: 'FL', guests: 1250, usedQty: 2200, usedValue: 14300, costPerLb: 6.50, costPerGuest: 11.44, lbsPerGuest: 1.76, lbsGuestVar: 0.00, costGuestVar: 0.94, impactYTD: 0, status: 'Optimal' },
                            { id: 102, name: 'Dallas Main', location: 'TX', guests: 980, usedQty: 1850, usedValue: 12025, costPerLb: 6.50, costPerGuest: 12.27, lbsPerGuest: 1.89, lbsGuestVar: 0.13, costGuestVar: 1.77, impactYTD: -15400, status: 'Warning' },
                            { id: 103, name: 'Las Vegas', location: 'NV', guests: 2100, usedQty: 4200, usedValue: 29400, costPerLb: 7.00, costPerGuest: 14.00, lbsPerGuest: 2.00, lbsGuestVar: 0.24, costGuestVar: 3.50, impactYTD: -42000, status: 'Critical' },
                            { id: 104, name: 'Chicago', location: 'IL', guests: 1500, usedQty: 2600, usedValue: 15600, costPerLb: 6.00, costPerGuest: 10.40, lbsPerGuest: 1.73, lbsGuestVar: -0.03, costGuestVar: -0.10, impactYTD: 5200, status: 'Optimal' },
                        ]);

                        // Try real fetch
                        const baseUrl = import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1';
                        const res = await fetch(`${baseUrl}/dashboard/bi-table?year=2026&week=9`, {
                            headers: { 'Authorization': 'Bearer mock-token' }
                        });
                        if (res.ok) {
                            const json = await res.json();
                            if (json.data) setPerformanceData(json.data);
                        }
                    } catch (err) {
                        console.error("Failed to fetch dashboard data", err);
                    }
                };
                fetchData();
            }, []);


            return (
                <div className={`text-[10px] font-bold uppercase tracking-widest ${meat.variance > 0.05 ? 'text-red-500' : meat.variance < -0.05 ? 'text-blue-500' : 'text-green-500'}`}>
                    {meat.variance > 0.05 ? 'Over' : meat.variance < -0.05 ? 'Under' : 'Ideal'}
                </div>
                                            </div >
                                        </div >
    {/* Progress Bar: Base is Goal (100%), Actual is relative */ }
    < div className = "h-1.5 bg-white/5 rounded-full overflow-hidden relative" >
        {/* Goal Marker (Virtual) */ }
        < div
className = {`h-full rounded-full transition-all duration-1000 ease-out ${meat.variance > 0.05 ? 'bg-red-600' : 'bg-green-600'}`}
style = {{ width: `${Math.min((meat.actualPerGuest / (meat.goalPerGuest * 1.5)) * 100, 100)}%` }}
                                            ></div >
                                        </div >
                                    </div >
                                ))}
                            </div >
                        </div >
                    </div >
                )}

{/* BI Machine Area */ }
<div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
    {/* Report Card (Side Panel or Top) */}
    <div className="lg:col-span-1">
        <NetworkReportCard />
    </div>

    {/* Main Table */}
    <div className="lg:col-span-3">
        <StorePerformanceTable />
    </div>
</div>
            </main >

    {/* Modals */ }
    < Modal title = "Add Manual Entry" isOpen = { showManualModal } onClose = {() => setShowManualModal(false)}>
        <ManualEntryForm onSubmit={handleManualSubmit} onClose={() => setShowManualModal(false)} />
            </Modal >

    {/* Manager Weekly Close Modal (Using Modal wrapper for consistency, though form has its own style) */ }
    < Modal title = "" isOpen = { showManagerModal } onClose = {() => setShowManagerModal(false)}>
        <div className="p-0">
            <WeeklyInputForm
                onSubmit={() => {
                    fetchStats(); // Refresh stats after close
                    // Maybe trigger confetti?
                }}
                onClose={() => setShowManagerModal(false)}
                storeId={parseInt(user?.id || "180")}
            />
        </div>
            </Modal >
        </div >
    );
};
